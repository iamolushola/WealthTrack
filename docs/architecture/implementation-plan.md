# WealthTrack Implementation Plan

## Objective

Deliver WealthTrack as a modular monolith first platform on NestJS, MySQL, Redis, BullMQ, object storage, and a dashboard web application. The implementation plan below is structured to keep module boundaries extraction-ready while ensuring the first release produces auditable, reconcilable analytics from confirmed valid investment records only.

## Architecture baseline

### Runtime shape

- `apps/api`: NestJS HTTP API for auth, RBAC, uploads, dashboards, reports, integrations, settings, and audit access
- `apps/worker`: NestJS worker for CSV processing, import confirmation, sync jobs, report generation, notifications, and outbox dispatch
- `apps/dashboard`: React, Next.js, or Vue dashboard application aligned to role-specific navigation
- `infra/mysql`: forward-only schema migrations
- `infra/redis`: queue and lock infrastructure
- object storage: private uploaded CSVs, error reports, and export artifacts

### Module boundaries

Each backend module should follow the target contract and own its use cases, DTOs, validators, policies, and persistence abstraction.

| Module | Owns | Depends on |
| --- | --- | --- |
| `auth` | login, logout, refresh, reset | `users`, `rbac`, `audit` |
| `users` | user management | `rbac`, `audit` |
| `rbac` | roles, permissions, guards, decorators | none |
| `uploads` | file upload, history, preview | `validation`, `imports`, `audit`, `jobs` |
| `validation` | row validation, duplicate checks | `fund-classification`, `tenor-classification`, `settings` |
| `imports` | confirm import transaction | `investments`, `audit`, `outbox`, `jobs` |
| `investments` | canonical investment facts | none |
| `analytics` | dashboard queries and calculations | `investments`, `settings` |
| `reports` | export requests and downloads | `analytics`, `audit`, `jobs` |
| `integrations` | source configuration and tests | `sync`, `audit`, `settings` |
| `sync` | manual and scheduled pull workflows | `integrations`, `validation`, `imports`, `jobs`, `audit` |
| `audit` | append-only audit writer and search APIs | none |
| `settings` | system settings, tenor bands, channels | `audit` |
| `notifications` | user-facing status alerts | `outbox`, `jobs` |
| `outbox` | transactional event persistence | none |
| `jobs` | queue registration and execution tracking | none |

## Delivery phases

### Phase 1: foundations

Scope:

- initialize monorepo layout under `apps`, `packages`, `infra`, and `docs`
- bootstrap API app with config, validation, OpenAPI, logging, correlation IDs, health endpoints
- bootstrap worker with BullMQ and Redis
- apply migrations `0001` through `0009`
- implement `auth`, `rbac`, `users`, `audit`, and `jobs` module skeletons

Acceptance criteria:

- health endpoints report MySQL and Redis readiness
- seeded roles and permissions are available
- login, logout, refresh, and `GET /api/v1/auth/me` work with RBAC-aware responses
- privileged actions produce audit entries with actor, IP, user agent, action, outcome, and correlation ID

### Phase 2: upload and validation core

Scope:

- implement signed object-storage upload flow and CSV ingestion entrypoint
- create upload batch row, store file metadata, enqueue `ProcessCsvUploadJob`
- build validation pipeline for required fields, types, enums, tenor classification, fund classification, duplicate checks, and preview persistence
- generate downloadable validation error reports

Acceptance criteria:

- only `.csv` files with approved size and schema are accepted
- preview shows valid, invalid, duplicate, and skipped rows without mutating dashboards
- uploaders can only see their own batches unless acting as admin
- failed validation and processing outcomes are visible in UI and persisted in audit and job history

### Phase 3: investment data core

Scope:

- implement import confirmation endpoint with idempotency enforcement
- insert only valid staged rows into `investment_records` inside a transaction
- write `investment.import.confirmed` or partial confirmation outbox events in the same transaction
- expose search and customer-history read APIs

Acceptance criteria:

- duplicate prevention blocks double counting by reference or source hash
- confirmation is idempotent and auditable
- records carry `data_source`, batch linkage, and confirmer identity
- dashboards still exclude rows not in `record_status = 'valid'` and `import_status = 'confirmed'`

### Phase 4: dashboards and analytics

Scope:

- implement central calculation service plus summary, trends, customer portfolio, and wealth manager query services
- add filter DTOs for date, customer type, fund type, tenor, relationship manager, and source channel
- expose dashboard APIs and cached query patterns where safe

Acceptance criteria:

- formulas are centralized and reused by exports
- analytics reconcile exactly with confirmed records in MySQL
- query plans use the designed composite indexes, not table scans, for expected reporting paths

### Phase 5: reporting and exports

Scope:

- implement async export request flow backed by `report_exports` and BullMQ
- generate CSV and Excel files first; reserve PDF for a later slice behind the same contract
- secure downloads through signed URLs and permission checks

Acceptance criteria:

- heavy exports run off-request
- report history is queryable by requester
- export request, completion, and download are audited

### Phase 6: secure integrations

Scope:

- implement API and read-only database integration setup
- store only secret references in MySQL; real credentials remain in a vault or secret manager
- add test-connection, manual sync, and scheduled sync flows
- route synced records through the same validation and import pipeline used for CSVs

Acceptance criteria:

- no frontend path can read or write raw integration credentials
- database integrations are confirmed read-only before activation
- sync failures preserve invalid payload traces in `sync_batch_errors` and audit logs

### Phase 7: hardening and scale readiness

Scope:

- performance-test large uploads, report jobs, and dashboard filters
- validate dead-letter replay tooling and reason capture
- add observability dashboards for API latency, queue lag, failures, and database hotspots
- perform security review and reconciliation UAT

Acceptance criteria:

- SLA alerts exist for upload processing, sync processing, and export generation
- DLQ replay requires admin permission and produces audit logs
- reconciliation tests prove dashboard figures match export figures for the same filters

## Database implementation strategy

### Migration order

Use the forward-only migrations under [infra/mysql/migrations/0001_foundation_users_roles_permissions.sql](infra/mysql/migrations/0001_foundation_users_roles_permissions.sql) through [infra/mysql/migrations/0009_indexes_constraints.sql](infra/mysql/migrations/0009_indexes_constraints.sql).

Key reasons for the ordering:

1. RBAC must exist before any privileged workflows are exercised.
2. Upload staging must exist before imports because dashboards cannot read raw files.
3. Reporting, audit, and jobs depend on prior business aggregates and request tracing.
4. Settings and tenor bands come late in DDL order but early in application bootstrap because validation uses them.

### Transaction boundaries

Apply these rules consistently:

- upload creation: `upload_batches` row plus initial audit entry
- import confirmation: staged row reads, `investment_records` inserts or updates, `upload_batches` status update, audit row, and outbox insert in one transaction
- report request: `report_exports` row and outbox insert in one transaction
- sync completion: `sync_batches` final status, imported records, audit row, and outbox insert in one transaction

### Query discipline

- all analytics and export repositories must share a single reusable predicate for valid confirmed records
- authorization must be enforced both in route guards and repository filters for ownership-scoped resources
- do not compute business totals from staging tables, raw object storage files, or failed sync payloads

## API and worker implementation sequence

### API first slice

Implement in this order:

1. auth and RBAC primitives
2. user management
3. uploads create, preview, history, confirm, cancel
4. dashboards
5. reports
6. integrations and sync control
7. audit search and export

### Worker first slice

Implement in this order:

1. `ProcessCsvUploadJob`
2. `GenerateUploadErrorReportJob`
3. `ConfirmImportJob`
4. `GenerateReportJob`
5. `ManualSyncJob`
6. `ScheduledSyncJob`
7. `DispatchOutboxEventJob`
8. notification jobs

Each worker job should hydrate a standard execution context carrying `job_id`, `request_id`, `correlation_id`, `actor_snapshot`, `source_type`, `batch_id`, and timestamps so API and worker traces remain connected.

## Frontend implementation sequence

### Role-oriented routing

- admin: dashboards, uploads, reports, integrations, users, audit logs, settings
- analyst: dashboards and reports only
- uploader: upload, preview, errors, and personal upload history only

### Delivery order

1. auth shell and permission-aware navigation
2. upload flow and preview UX
3. summary and trends dashboards
4. customer portfolio and wealth manager dashboards
5. reports
6. users, integrations, audit logs, settings

## Testing plan

### Required test layers

- unit tests for validators, policies, calculation service, and classification logic
- integration tests for repositories, migrations, and transaction boundaries
- contract tests for API envelopes and permission behavior
- E2E tests for login, upload validation, import confirmation, dashboard reconciliation, report export, and sync trigger flows

### High-risk scenarios to lock down early

- duplicate upload row should not create duplicate confirmed investment
- uploader must not access analytics endpoints
- analyst must not confirm imports or trigger syncs
- export filters must match dashboard totals for the same filter set
- sync retry and DLQ replay must not double-insert investment facts

## Operational plan

### Environment dependencies

- MySQL 8.0+ with strict SQL mode enabled
- Redis for BullMQ, locks, and ephemeral coordination
- private object storage with signed URL support
- secret manager or vault for integration credentials
- structured logging pipeline with correlation ID support

### Observability minimums

- API latency, error rate, and auth failure rate
- queue depth, queue lag, retry count, and DLQ count
- upload processing duration and failure rate
- sync duration, invalid-record rate, and success rate
- export generation duration and failure rate
- slow dashboard query logging

## Recommended next build artifacts

After approving this plan, the next concrete deliverables should be:

1. monorepo scaffolding with `apps/api`, `apps/worker`, and `apps/dashboard`
2. NestJS module skeletons and shared config package
3. migration runner wiring and local Docker Compose for MySQL and Redis
4. OpenAPI-first DTO contracts for auth, uploads, dashboards, reports, and integrations

---

## Phase 8: customers, investments, and managers — detail views and interaction architecture

### Objective

Elevate the Customers (`/portfolio`), Investments (`/investments`), and Managers (`/wealth-managers`) tabs from paginated list surfaces into full interaction layers. Each tab gains a standardised side drawer for row-level actions and a dedicated inner-page detail view for granular drill-down. Navigation preserves pagination and scroll state so that returning from a detail view restores the user's exact prior list position.

---

### 8.1 Frontend architecture

#### 8.1.1 Routing evolution

The current `currentView` map uses twelve static pathnames. Detail routes introduce dynamic segments. The App component already uses `useNavigate`, `useLocation`, and React Router's `BrowserRouter`, so parametric routes are addable without re-architecting the shell.

Extend `currentView` resolution to detect detail sub-paths and expose the active param alongside the view identifier:

```typescript
type ViewId =
  | 'summary' | 'trends'
  | 'portfolio' | 'portfolio-detail'
  | 'investments' | 'investment-detail'
  | 'wealth-managers' | 'manager-detail'
  | 'uploads' | 'reports' | 'users' | 'settings';

type ActiveRoute =
  | { view: Exclude<ViewId, 'portfolio-detail' | 'investment-detail' | 'manager-detail'>; param: null }
  | { view: 'portfolio-detail';   param: string }   // customerId
  | { view: 'investment-detail';  param: string }   // investmentId
  | { view: 'manager-detail';     param: string };  // encodedManagerName
```

Route path additions (added to `viewPaths` and `pathMap`):

| Route | ViewId | Param |
|---|---|---|
| `/portfolio/:customerId` | `portfolio-detail` | `customerId` |
| `/investments/:investmentId` | `investment-detail` | `investmentId` |
| `/wealth-managers/:managerId` | `manager-detail` | `managerId` |

`managerId` is the URL-encoded relationship manager name, since managers are not currently stored as first-class entity rows in the database.

#### 8.1.2 Pagination and scroll state preservation

State that must survive navigation to a detail view and back:

| Module | State to preserve |
|---|---|
| Customers | `page`, `pageSize`, `searchQuery`, `activeCustomerStatus`, `scrollY` |
| Investments | `page`, `pageSize`, `searchQuery`, `activeRange`, scroll position |
| Managers | `searchQuery`, scroll position |

Implementation: encode the list state into the navigation `state` object on every `navigate()` call that enters a detail view. On detail-to-list back-navigation, read `location.state` and rehydrate. Do not use `localStorage` for this — the state is scoped to a single browsing session and `location.state` is cleared when the tab is closed, which is the correct behaviour.

```typescript
// navigating INTO a detail view
navigate(`/portfolio/${customerId}`, {
  state: {
    fromList: true,
    page: portfolioPage,
    pageSize: portfolioPageSize,
    searchQuery,
    activeCustomerStatus,
    scrollY: window.scrollY,
  },
});

// navigating BACK to the list
const back = (location.state as ListReturnState | null);
if (back?.fromList) {
  navigate('/portfolio', { replace: true });
  setPortfolioPage(back.page);
  setPortfolioPageSize(back.pageSize);
  setSearchQuery(back.searchQuery);
  setActiveCustomerStatus(back.activeCustomerStatus);
  requestAnimationFrame(() => window.scrollTo(0, back.scrollY));
} else {
  navigate('/portfolio');
}
```

State variables to add to App component:

```typescript
const [portfolioPage, setPortfolioPage]       = useState(1);
const [portfolioPageSize, setPortfolioPageSize] = useState(25);
const [investmentsPage, setInvestmentsPage]   = useState(1);
const [investmentsPageSize, setInvestmentsPageSize] = useState(50);
```

#### 8.1.3 Side drawer component

A single reusable `ActionDrawer` pattern (matching the existing Invite User / Create Role drawer implementation) is used for all list-row actions. The same `.drawer-scrim`, `.drawer`, `.drawer-header`, `.drawer-body`, and `.drawer-footer` CSS classes apply.

Each module has its own drawer state variable:

```typescript
type PortfolioDrawer = { mode: 'customer'; customerId: string; customerName: string } | { mode: null };
type InvestmentDrawer = { mode: 'record';  investmentId: string } | { mode: null };
type ManagerDrawer    = { mode: 'manager'; managerId: string; managerName: string } | { mode: null };

const [portfolioDrawer, setPortfolioDrawer] = useState<PortfolioDrawer>({ mode: null });
const [investmentDrawer, setInvestmentDrawer] = useState<InvestmentDrawer>({ mode: null });
const [managerDrawer, setManagerDrawer] = useState<ManagerDrawer>({ mode: null });
```

**Customer action drawer — contents:**

- Customer name and customer type badge at the top
- Four stat cards: Total mobilised, Investment count, Inflow value, Rollover value
- Tenor exposure mini-bar (inline `<progress>`-style segments for each tenor category)
- Primary CTA: "View full profile" — navigates to `/portfolio/:customerId` with list state in `navigate` state
- Secondary CTA: "Export history" — opens the report creation dialog pre-filled for `customer_portfolio` type with that customer's ID
- Danger CTA (admin only, permission-guarded): "Remove customer data" — opens confirmation dialog for bulk delete

**Investment action drawer — contents:**

- Investment reference and status badges
- Eight data fields: Amount, Fund type, Tenor, Maturity date, Source channel, Relationship manager, Import batch, Data source
- Validation status: record status pill + import status pill
- Primary CTA: "View investment detail" — navigates to `/investments/:investmentId`
- Secondary CTA (admin only): "Flag for review" — POST to a future `investments/:id/flags` endpoint

**Manager action drawer — contents:**

- Manager name at top
- Five KPI stat cards: Total AUM, Customer count, NTB customers, Inflow value, Avg. cost of funds
- Top-3 customers table (name + AUM, truncated list)
- Primary CTA: "View manager profile" — navigates to `/wealth-managers/:managerId`
- Secondary CTA: "Export manager report" — opens report dialog pre-filled for `wealth_manager` type

#### 8.1.4 List row action wiring

Replace all existing inline dialog triggers on list rows with drawer triggers. Each list row's action cell changes from:

```tsx
<button className="table-action" onClick={() => openDialog(...)}>
  View details <Icon name="launch" />
</button>
```

to:

```tsx
// Customers
<button className="table-action" onClick={() => setPortfolioDrawer({ mode: 'customer', customerId: c.customerId, customerName: c.customerName })}>
  View details <Icon name="chevron-right" />
</button>

// Investments
<button className="table-action" onClick={() => setInvestmentDrawer({ mode: 'record', investmentId: item.id })}>
  View record <Icon name="chevron-right" />
</button>

// Managers
<button className="table-action" onClick={() => setManagerDrawer({ mode: 'manager', managerId: encodeURIComponent(m.relationshipManager), managerName: m.relationshipManager })}>
  View details <Icon name="chevron-right" />
</button>
```

#### 8.1.5 Detail page inner layout

Each detail page uses the same `.trends-charts-page` shell and follows the Trends page visual language: a toolbar-style header strip, chart panels in a `.trends-chart-grid`, and a data table below.

**Customer profile page (`/portfolio/:customerId`):**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Customers     [Customer Name]    [customer type]  │ ← page-title-row
├─────────────────────────────────────────────────────────────┤
│ [AUM Total] [Count] [Inflow] [Rollover] [Avg Ticket]        │ ← 5 trends-chart-panel KPI cards (1 row, compact)
├──────────────────────┬──────────────────────────────────────┤
│ Mobilisation over    │  Tenor exposure                      │ ← trends-chart-grid (2 cols)
│ time (area chart)    │  (horizontal bar chart)              │
├──────────────────────┴──────────────────────────────────────┤
│ All investments for this customer (data-table)              │ ← sortable, with status pills
└─────────────────────────────────────────────────────────────┘
```

Data fetched from `GET /api/v1/dashboard/customer-portfolio/:customerId` (enhanced — see section 8.2.2).

State variables specific to this detail view:

```typescript
const [customerDetail, setCustomerDetail] = useState<AsyncState<CustomerDetailResponse>>({ status: 'idle', data: null, error: null });
```

**Investment detail page (`/investments/:investmentId`):**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Investments   [Reference]    [status] [import]    │
├──────────────────────┬──────────────────────────────────────┤
│ Record details        │  Lifecycle & provenance             │
│ (summary-kpi-list)   │  (summary-kpi-list)                  │
├──────────────────────┴──────────────────────────────────────┤
│ Customer context: other investments by same customer        │
│ (compact table, max 10 rows, link to full customer view)    │
└─────────────────────────────────────────────────────────────┘
```

Data fetched from `GET /api/v1/investments/:investmentId` (new — see section 8.2.3).

**Manager profile page (`/wealth-managers/:managerId`):**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Managers   [Manager Name]                         │
├──────────────────────────────────────────────────────────────┤
│ [AUM] [Customers] [NTB] [Returning] [Inflow] [CoF]         │ ← 6 KPI panels
├──────────────────────┬──────────────────────────────────────┤
│ AUM over time        │  Customer mix                        │ ← area + pie chart
│ (area chart)         │  (NTB vs returning donut)            │
├──────────────────────┬──────────────────────────────────────┤
│ Fund aging buckets   │  Top customers                       │
│ (stacked bar)        │  (ranked table, top 10)              │
└──────────────────────┴──────────────────────────────────────┘
```

Data fetched from `GET /api/v1/dashboard/wealth-managers/:managerId` (new — see section 8.2.4).

---

### 8.2 Backend API specification

#### 8.2.1 Enhanced: `GET /api/v1/dashboard/customer-portfolio`

Required permission: `dashboard.customer_portfolio.read`

Current implementation loads all records into memory and paginates in-process. This must remain compatible but add server-side search and filter query parameters.

Query parameters:

| Parameter | Type | Description |
|---|---|---|
| `page` | integer ≥ 1 | Page number, default 1 |
| `pageSize` | integer 10–100 | Page size, default 25 |
| `search` | string | Free-text match against `customer_name` or `customer_id` |
| `customerType` | `new` \| `returning` \| `all` | Filter by customer classification |
| `from` | ISO date | Filter by `mobilisation_date ≥ from` |
| `to` | ISO date | Filter by `mobilisation_date ≤ to` |
| `sortBy` | `totalInvestment` \| `investmentCount` \| `lastInvestmentDate` | Sort dimension, default `totalInvestment` |
| `sortDir` | `asc` \| `desc` | Sort direction, default `desc` |

Response envelope (unchanged structure, extended fields):

```typescript
type CustomerPortfolioResponse = {
  items: CustomerPortfolioItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type CustomerPortfolioItem = {
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';
  totalInvestment: number;          // DECIMAL sum
  investmentCount: number;
  inflowValue: number;
  rolloverValue: number;
  lastInvestmentAmount: number;
  lastInvestmentDate: string;       // ISO date string
  contributionPercentage: number;   // 0–100
  tenorExposure: Record<string, number>; // tenorCategory → total value
};
```

#### 8.2.2 Enhanced: `GET /api/v1/dashboard/customer-portfolio/:customerId`

Required permission: `dashboard.customer_portfolio.read`

Current implementation returns the raw `InvestmentRecordRow[]` array. Replace with a fully computed response that the detail page can render without client-side aggregation.

Response schema:

```typescript
type CustomerDetailResponse = {
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';

  // Aggregate summary
  totalInvestment: number;
  investmentCount: number;
  inflowValue: number;
  rolloverValue: number;
  averageInvestmentPerRecord: number;
  averageCostOfFunds: number | null;
  contributionPercentage: number;   // share of all-customer AUM

  // Time series for chart (monthly by mobilisation date)
  mobilisationSeries: Array<{
    period: string;          // "YYYY-MM"
    totalInvestment: number;
    investmentCount: number;
  }>;

  // Tenor breakdown for chart
  tenorBreakdown: Array<{
    tenorCategory: string;
    label: string;
    investmentValue: number;
    investmentCount: number;
  }>;

  // Latest relationship manager and source channel (most frequent)
  primaryRelationshipManager: string | null;
  primarySourceChannel: string | null;

  // First and most recent mobilisation dates
  firstMobilisationDate: string;
  lastMobilisationDate: string;

  // Full investment history — sorted by mobilisation date desc
  investments: Array<{
    id: string;
    investmentReference: string | null;
    investmentAmount: number;
    fundType: 'inflow' | 'rollover';
    tenorDays: number;
    tenorCategory: string;
    maturityDate: string;
    mobilisationDate: string;
    relationshipManager: string | null;
    sourceChannel: string | null;
    recordStatus: string;
    importStatus: string;
    dataSource: string;
    uploadBatchId: string | null;
  }>;
};
```

Service implementation notes:

- Use `listConfirmedValid()` filtered to `customerId` to get this customer's records.
- Compute `contributionPercentage` by dividing this customer's `totalInvestment` by the global AUM (requires a second query or a shared in-memory aggregate — use a cached global total that is computed once per request context rather than a full secondary scan).
- `mobilisationSeries` groups records by `isoMonth(mobilisationDate)`.
- `primaryRelationshipManager` is the manager name that appears most frequently across this customer's records.

#### 8.2.3 New: `GET /api/v1/investments/:investmentId`

Required permission: `dashboard.summary.read`

This replaces the current `GET /api/v1/investments/:customerId` pattern for single-record lookup. The existing `/:customerId` route remains as a customer history endpoint; this new route resolves by UUID.

The `InvestmentsController` must distinguish between the two by checking whether the param matches a UUID v7 pattern (the investment row primary key) vs. a plain customer ID string. Alternatively, add a separate prefix: `GET /api/v1/investments/record/:investmentId`.

Recommended path: `GET /api/v1/investments/record/:investmentId` to avoid ambiguity.

Response schema:

```typescript
type InvestmentDetailResponse = {
  id: string;                        // UUID v7 — investment_records.id
  investmentReference: string | null;
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';

  // Financial facts
  investmentAmount: number;
  fundType: 'inflow' | 'rollover';
  tenorDays: number;
  tenorCategory: string;
  maturityDate: string;
  mobilisationDate: string;
  costOfFunds: number | null;

  // Provenance
  relationshipManager: string | null;
  sourceChannel: string | null;
  dataSource: 'csv_upload' | 'manual_entry' | 'api_sync';
  uploadBatchId: string | null;
  uploadBatchRowId: string | null;
  integrationSourceId: string | null;
  sourceRecordHash: string | null;

  // Status
  recordStatus: 'valid' | 'invalid' | 'duplicate' | 'skipped';
  importStatus: 'pending' | 'confirmed' | 'rejected';

  // Lifecycle
  createdAt: string;
  updatedAt: string;

  // Sibling records — other investments by the same customer (max 5, most recent first)
  customerContext: Array<{
    id: string;
    investmentAmount: number;
    fundType: 'inflow' | 'rollover';
    mobilisationDate: string;
    maturityDate: string;
    recordStatus: string;
    importStatus: string;
  }>;
};
```

Repository method to add on `InvestmentsRepository`:

```typescript
findById(id: string): Promise<InvestmentRecordRow | null>;
findByCustomerIdLimit(customerId: string, limit: number): Promise<InvestmentRecordRow[]>;
```

#### 8.2.4 New: `GET /api/v1/dashboard/wealth-managers/:managerId`

Required permission: `dashboard.wealth_manager.read`

`managerId` is the URL-encoded relationship manager name (e.g. `"James%20Adeyemi"`). The analytics service filters `investment_records` by `relationship_manager = decodedManagerName`.

Response schema:

```typescript
type ManagerDetailResponse = {
  managerId: string;             // URL-encoded manager name — stable identifier for routing
  managerName: string;

  // Aggregate KPIs
  totalAum: number;
  investmentAccountCount: number;
  customerCount: number;
  ntbCustomerCount: number;
  returningCustomerCount: number;
  inflowValue: number;
  rolloverValue: number;
  averageCostOfFunds: number | null;

  // Market share
  aumShare: number;              // this manager's AUM ÷ total platform AUM (0–100)

  // Time series — monthly mobilisation (for area chart)
  mobilisationSeries: Array<{
    period: string;              // "YYYY-MM"
    totalInvestment: number;
    investmentCount: number;
    newCustomerInvestment: number;
    returningCustomerInvestment: number;
  }>;

  // Customer mix breakdown (for donut chart)
  customerMix: {
    ntb: { count: number; investmentValue: number };
    returning: { count: number; investmentValue: number };
  };

  // Fund aging buckets (for stacked bar chart)
  fundsAging: {
    days0To90:    { investmentCount: number; investmentValue: number };
    days120To210: { investmentCount: number; investmentValue: number };
    days240To330: { investmentCount: number; investmentValue: number };
    days366Plus:  { investmentCount: number; investmentValue: number };
    unclassified: { investmentCount: number; investmentValue: number };
  };

  // Top customers — sorted by total AUM descending, max 10
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    customerType: 'new' | 'returning';
    totalInvestment: number;
    investmentCount: number;
    contributionPercentage: number;   // share of this manager's total AUM
    lastInvestmentDate: string;
  }>;
};
```

Service implementation notes:

- Filter all confirmed valid records to `relationshipManager === decodedManagerName`.
- Compute `aumShare` by dividing this manager's `totalAum` by the global platform AUM.
- `mobilisationSeries` uses the same `buildBreakdownPoints` helper already implemented in `AnalyticsService`, scoped to this manager's records.
- `topCustomers` uses the same customer aggregation loop as `customerPortfolio`, but scoped to records for this manager only.

Add route to `AnalyticsController`:

```typescript
@RequirePermissions('dashboard.wealth_manager.read')
@Get('wealth-managers/:managerId')
async wealthManagerDetail(@Param('managerId') managerId: string): Promise<object> {
  return this.analyticsService.wealthManagerDetail(decodeURIComponent(managerId));
}
```

---

### 8.3 Data fetch wiring (frontend)

Each detail view follows the same `AsyncState` + `useEffect` pattern used throughout the app:

```typescript
// Customer detail
const [customerDetail, setCustomerDetail] = useState<AsyncState<CustomerDetailResponse>>({
  status: 'idle', data: null, error: null,
});

useEffect(() => {
  if (activeRoute.view !== 'portfolio-detail') return;
  setCustomerDetail({ status: 'loading', data: null, error: null });
  apiFetch<CustomerDetailResponse>(`dashboard/customer-portfolio/${activeRoute.param}`)
    .then((data) => setCustomerDetail({ status: 'ok', data, error: null }))
    .catch((err: unknown) => setCustomerDetail({ status: 'error', data: null, error: String(err) }));
}, [activeRoute.view, activeRoute.param]);

// Investment detail
const [investmentDetail, setInvestmentDetail] = useState<AsyncState<InvestmentDetailResponse>>({
  status: 'idle', data: null, error: null,
});

useEffect(() => {
  if (activeRoute.view !== 'investment-detail') return;
  setInvestmentDetail({ status: 'loading', data: null, error: null });
  apiFetch<InvestmentDetailResponse>(`investments/record/${activeRoute.param}`)
    .then((data) => setInvestmentDetail({ status: 'ok', data, error: null }))
    .catch((err: unknown) => setInvestmentDetail({ status: 'error', data: null, error: String(err) }));
}, [activeRoute.view, activeRoute.param]);

// Manager detail
const [managerDetail, setManagerDetail] = useState<AsyncState<ManagerDetailResponse>>({
  status: 'idle', data: null, error: null,
});

useEffect(() => {
  if (activeRoute.view !== 'manager-detail') return;
  setManagerDetail({ status: 'loading', data: null, error: null });
  apiFetch<ManagerDetailResponse>(`dashboard/wealth-managers/${activeRoute.param}`)
    .then((data) => setManagerDetail({ status: 'ok', data, error: null }))
    .catch((err: unknown) => setManagerDetail({ status: 'error', data: null, error: String(err) }));
}, [activeRoute.view, activeRoute.param]);
```

When the active route is a detail view, the sidebar highlight should still show the parent section (Portfolio, Investments, or Managers). Implement this by mapping detail views to their parent in `currentView` resolution:

```typescript
function getSidebarView(route: ActiveRoute): ViewId {
  if (route.view === 'portfolio-detail')   return 'portfolio';
  if (route.view === 'investment-detail')  return 'investments';
  if (route.view === 'manager-detail')     return 'wealth-managers';
  return route.view;
}
```

---

### 8.4 CSS additions required

All existing CSS classes are reused. The additions below are the only new rules needed.

```css
/* Detail page back navigation strip */
.detail-back-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.detail-back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--soft);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  letter-spacing: 0.02em;
}

.detail-back-button:hover {
  color: var(--text-strong);
}

/* Compact 5-column KPI grid for detail page headers */
.detail-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

/* Compact variant of trends-chart-panel for KPI-only panels */
.trends-chart-panel.panel-kpi-only {
  padding: 16px 20px;
}

/* Drawer stat cards — used inside action drawers */
.drawer-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.drawer-stat-card {
  background: var(--bg-strong);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
}

.drawer-stat-card p {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.drawer-stat-card strong {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong);
}

/* Tenor exposure inline bar inside drawer */
.drawer-tenor-bar {
  display: flex;
  height: 6px;
  border-radius: 4px;
  overflow: hidden;
  gap: 2px;
  margin-top: 8px;
}

.drawer-tenor-segment {
  height: 100%;
  border-radius: 2px;
}
```

---

### 8.5 Delivery sequence

Implement in this order to avoid blocking other UI work:

1. **Backend — customer detail enhancement.** Replace `customerPortfolioDetail` to return the computed `CustomerDetailResponse` schema. No migration required — uses existing tables and in-process aggregation.

2. **Backend — investment record detail.** Add `GET /api/v1/investments/record/:investmentId` handler, repository `findById` method, and `customerContext` sibling lookup.

3. **Backend — manager detail.** Add `GET /api/v1/dashboard/wealth-managers/:managerId` handler and `wealthManagerDetail` service method.

4. **Backend — customer portfolio search params.** Add `search`, `customerType`, `sortBy`, `sortDir` query params to `customerPortfolio` service. These filter and sort the in-memory accumulator result before slicing.

5. **Frontend — navigation types.** Extend `ActiveRoute` union type, add detail paths to `pathMap` and `viewPaths`, add `getSidebarView` helper.

6. **Frontend — pagination state variables.** Add `portfolioPage`, `portfolioPageSize`, `investmentsPage`, `investmentsPageSize` to App state.

7. **Frontend — `renderPortfolioDrawer()`.** Implement customer action drawer matching the drawer pattern of `renderUserDrawer()`. Wire "View full profile" CTA to navigate with list state.

8. **Frontend — `renderInvestmentDrawer()`.** Implement investment record drawer. Wire "View investment detail" CTA.

9. **Frontend — `renderManagerDrawer()`.** Implement manager action drawer. Wire "View manager profile" CTA.

10. **Frontend — `renderCustomerDetailPage()`.** Chart-first inner page with area chart (mobilisation over time), horizontal bar (tenor exposure), and full investment history table.

11. **Frontend — `renderInvestmentDetailPage()`.** Two-column `summary-kpi-list` layout for record fields and provenance, plus compact sibling table.

12. **Frontend — `renderManagerDetailPage()`.** Six KPI panels, area chart (AUM over time), donut (customer mix), aging bar chart, top-customers table.

13. **Frontend — back navigation.** Implement state restoration in all three back-navigation handlers.

14. **CSS additions.** Add the rules from section 8.4 to `styles.css`.

### 8.6 Acceptance criteria

- Navigating from a customer list on page 3 to a customer detail and back restores page 3, the same search query, and the same scroll position without a network re-fetch.
- Every list row in Customers, Investments, and Managers opens a side drawer on click — no row navigates directly on click.
- The side drawer's primary CTA is the only entry point into the detail view.
- Detail pages show loading and error states before data arrives.
- The sidebar highlights the parent section (Portfolio, Investments, or Managers) while a detail sub-route is active.
- All new API endpoints return the exact computed schemas specified in section 8.2; client-side aggregation on the detail pages is limited to chart series formatting only.
- The `GET /api/v1/dashboard/customer-portfolio` endpoint accepts and correctly applies `search`, `customerType`, `sortBy`, and `sortDir` query parameters.
- No test, seed, or placeholder data appears in any response; all values are derived from confirmed valid investment records only.