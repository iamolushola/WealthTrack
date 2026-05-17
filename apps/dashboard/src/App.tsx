import { type ReactNode, useEffect, useState } from 'react';

type HealthState = {
  status: 'idle' | 'ready' | 'degraded';
  label: string;
  details: string;
};

type NavItem = {
  label: string;
  section?: string;
  icon: IconName;
  active?: boolean;
};

type DashboardArea = {
  id: string;
  name: string;
  description: string;
  metric: string;
  audience: string;
  priority: 'P0' | 'P1';
};

type Metric = {
  label: string;
  value: string;
  helper: string;
  tone: 'neutral' | 'good' | 'warn';
};

type Activity = {
  time: string;
  title: string;
  detail: string;
};

type IconName =
  | 'grid'
  | 'briefcase'
  | 'file'
  | 'wallet'
  | 'users'
  | 'shield'
  | 'alert'
  | 'download'
  | 'database'
  | 'chart'
  | 'settings'
  | 'search'
  | 'bell'
  | 'logout'
  | 'chevron'
  | 'check'
  | 'x'
  | 'spark';

const navigationItems: NavItem[] = [
  { label: 'Summary Dashboard', section: 'Dashboards', icon: 'grid', active: true },
  { label: 'Trends Dashboard', icon: 'chart' },
  { label: 'Customer Portfolio', icon: 'wallet' },
  { label: 'Wealth Manager Performance', icon: 'users' },
  { label: 'Upload & Validation', section: 'Operations', icon: 'briefcase' },
  { label: 'Reports', icon: 'file' },
  { label: 'Integration Logs', icon: 'database' },
  { label: 'Audit Logs', section: 'Governance', icon: 'shield' },
  { label: 'User Management', icon: 'users' },
  { label: 'Settings', section: 'System', icon: 'settings' },
];

const tabs = [
  'Summary Dashboard',
  'Trends Dashboard',
  'Customer Portfolio',
  'Wealth Manager Performance',
  'Upload & Validation',
  'Reports',
  'Audit Logs',
  'Integration Logs',
];

const dashboardAreas: DashboardArea[] = [
  {
    id: 'summary',
    name: 'Summary Dashboard',
    description: 'High-level investment performance overview covering total investment, customer counts, fund split, tenor split, averages, and highest contribution.',
    metric: 'P0 overview metrics',
    audience: 'Admin, Analyst, Executive',
    priority: 'P0',
  },
  {
    id: 'trends',
    name: 'Trends Dashboard',
    description: 'Daily, weekly, monthly, quarterly, and yearly mobilisation trends with new vs returning, inflow vs rollover, and tenor movement views.',
    metric: 'Period trend views',
    audience: 'Admin, Analyst',
    priority: 'P0',
  },
  {
    id: 'portfolio',
    name: 'Customer Portfolio Dashboard',
    description: 'Customer ranking by total contribution, investment count, last investment amount and date, fund split, and contribution percentage.',
    metric: 'Customer ranking + search',
    audience: 'Admin, Analyst, Relationship Manager',
    priority: 'P0',
  },
  {
    id: 'manager-performance',
    name: 'Wealth Manager Performance Dashboard',
    description: 'Mobilisation volume by relationship manager, customer count, inflow and rollover mix, average contribution, and top customers by RM.',
    metric: 'RM mobilisation performance',
    audience: 'Admin, Analyst, Management',
    priority: 'P1',
  },
  {
    id: 'upload-validation',
    name: 'Upload & Validation Dashboard',
    description: 'CSV upload, preview, row-level validation feedback, duplicate detection, import confirmation, and upload history.',
    metric: '12 files today',
    audience: 'Admin, Uploader',
    priority: 'P0',
  },
  {
    id: 'reports',
    name: 'Reporting & Export Module',
    description: 'Export summary, trends, customer portfolio, and wealth manager reports using current filters and selected views.',
    metric: '42 exports delivered',
    audience: 'Admin, Analyst',
    priority: 'P1',
  },
  {
    id: 'audit',
    name: 'Audit & Activity Logging',
    description: 'Trace uploads, imports, exports, login attempts, admin changes, and integration activity for governance and reconciliation.',
    metric: 'Critical actions logged',
    audience: 'Admin, Compliance, Finance',
    priority: 'P0',
  },
  {
    id: 'integrations',
    name: 'Secure Data Integration Module',
    description: 'Admin-controlled API or read-only database integrations with sync logs, scheduling, error handling, and field mapping.',
    metric: '95% sync success target',
    audience: 'Admin, Engineering',
    priority: 'P1',
  },
];

const metrics: Metric[] = [
  { label: 'Total Investment Amount', value: 'NGN 8.4B', helper: 'Sum of all valid investment records', tone: 'good' },
  { label: 'Total Unique Customers', value: '1,284', helper: 'Distinct customer_id across valid records', tone: 'neutral' },
  { label: 'Inflow Funds', value: 'NGN 5.3B', helper: 'Freshly injected funds within the filtered period', tone: 'good' },
  { label: 'Rollover Funds', value: 'NGN 3.1B', helper: 'Retained or reinvested funds in the same window', tone: 'warn' },
];

const activityItems: Activity[] = [
  { time: '21:05', title: 'Summary report exported', detail: 'Analyst exported the filtered summary dashboard for management review.' },
  { time: '18:42', title: 'CSV validation completed', detail: 'Upload batch finished preview with invalid, duplicate, and skipped rows identified.' },
  { time: '16:10', title: 'Integration sync completed', detail: '23 valid records were normalised and one failed record was logged for review.' },
];

function Icon({ name }: { name: IconName }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    briefcase: <><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" /><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 10v2M16 10v2" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
    wallet: <><path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" /><path d="M16 13h2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-5" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    chart: <><path d="M4 19V5" /><path d="M8 19v-7" /><path d="M12 19V8" /><path d="M16 19v-4" /><path d="M20 19V4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1 1.63V21a2 2 0 1 1-4 0v-.09a1.8 1.8 0 0 0-1-1.63 1.8 1.8 0 0 0-2 .36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.63-1H3a2 2 0 1 1 0-4h.09a1.8 1.8 0 0 0 1.63-1 1.8 1.8 0 0 0-.36-2l-.06-.06A2 2 0 1 1 7.13 3.9l.06.06a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1-1.63V3a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1 1.63 1.8 1.8 0 0 0 2-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.63 1H21a2 2 0 1 1 0 4h-.09a1.8 1.8 0 0 0-1.51 1Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    logout: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    spark: <><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  };

  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function App() {
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    label: 'Checking API',
    details: __APP_API_BASE_URL__,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth(): Promise<void> {
      try {
        const response = await fetch(`${__APP_API_BASE_URL__}/health/ready`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { status?: string; dependencies?: string[] };
        if (cancelled) {
          return;
        }

        setHealth({
          status: payload.status === 'ready' ? 'ready' : 'degraded',
          label: payload.status === 'ready' ? 'API connected' : 'API warnings',
          details: (payload.dependencies ?? []).join(' · ') || 'Dependency metadata unavailable',
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        setHealth({
          status: 'degraded',
          label: 'API unavailable',
          details: `${__APP_API_BASE_URL__} · ${message}`,
        });
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
        <Icon name="grid" />
        Menu
      </button>

      <div className={mobileNavOpen ? 'mobile-scrim mobile-scrim-open' : 'mobile-scrim'} onClick={() => setMobileNavOpen(false)} />

      <aside className={mobileNavOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="brand-row">
          <div className="brand-mark">W</div>
          <strong>WealthTrack</strong>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <div key={item.label}>
              {item.section ? <p className="nav-section">{item.section}</p> : null}
              <button className={item.active ? 'nav-item nav-item-active' : 'nav-item'} type="button" onClick={() => setMobileNavOpen(false)}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </nav>

        <button className="collapse-button" type="button">
          <Icon name="chevron" />
          Collapse
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <h1>Summary Dashboard</h1>
            <span>Overview</span>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Search"><Icon name="search" /></button>
            <button className="icon-button" type="button" aria-label="Notifications"><Icon name="bell" /></button>
            <div className="topbar-divider" />
            <div className="user-menu">
              <span className="user-avatar">PA</span>
              <span><strong>Operations Lead</strong><small>Portfolio Admin</small></span>
            </div>
            <button className="icon-button" type="button" aria-label="Log out"><Icon name="logout" /></button>
          </div>
        </header>

        <div className="content-shell">
          <div className="breadcrumbs" aria-label="Breadcrumb">
            <a>WealthTrack</a>
            <Icon name="chevron" />
            <span>Summary Dashboard</span>
          </div>

          <section className="business-hero" aria-label="Business profile">
            <div className="business-identity">
              <div className="business-logo">VM</div>
              <div>
                <div className="business-title-row">
                  <h2>WealthTrack Investment Mobilisation Platform</h2>
                  <span className="status-badge status-badge-active">Active</span>
                </div>
                <p className="business-meta">/wealthtrack <span /> Nigeria <span /> ops@wealthtrack.local</p>
                <p className="business-legal">Controlled platform for importing, validating, analysing, and reporting customer investment data.</p>
              </div>
            </div>

            <div className="business-controls">
              <button className="danger-button" type="button">Export Summary</button>
              <div className="date-block"><span>Reporting Window</span><strong>Daily to yearly views</strong></div>
            </div>
          </section>

          <section className="metric-strip" aria-label="Business metrics">
            {metrics.map((metric) => (
              <article key={metric.label} className={`metric-card metric-card-${metric.tone}`}>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span>{metric.helper}</span>
              </article>
            ))}
          </section>

          <nav className="tabs" aria-label="Business sections">
            {tabs.map((tab) => (
              <button key={tab} className={tab === 'Summary Dashboard' ? 'tab tab-active' : 'tab'} type="button">
                {tab}
                {tab === 'Upload & Validation' ? <small>4</small> : null}
                {tab === 'Integration Logs' ? <small>3</small> : null}
              </button>
            ))}
          </nav>

          <section className="dashboard-grid">
            <div className="main-panel product-panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">MVP coverage</p>
                  <h3>PRD Dashboard Areas And Modules</h3>
                  <span>The WealthTrack MVP centers on these dashboards and operational modules from the approved product scope.</span>
                </div>
                <div className="summary-pill"><Icon name="spark" /> {dashboardAreas.length} areas</div>
              </div>

              <div className="product-grid">
                {dashboardAreas.map((moduleItem) => (
                  <button key={moduleItem.id} className="product-row product-row-enabled" type="button">
                    <span className="checkbox-mark"><Icon name="check" /></span>
                    <span className="product-copy">
                      <strong>{moduleItem.name}</strong>
                      <small>{moduleItem.description}</small>
                    </span>
                    <span className="product-stat">
                      <strong>{moduleItem.metric}</strong>
                      <small>{moduleItem.audience} · {moduleItem.priority}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="product-footer">
                <p>The core PRD dashboards are Summary, Trends, Customer Portfolio, Wealth Manager Performance, Upload & Validation, Reports, Audit Logs, and Integration Logs.</p>
                <button className="primary-button" type="button">Open Reporting Matrix</button>
              </div>
            </div>

            <aside className="side-column" aria-label="Workspace context">
              <section className="context-panel">
                <div className="section-header compact">
                  <div>
                    <p className="eyebrow">Infrastructure</p>
                    <h3>Platform Runtime</h3>
                  </div>
                </div>
                <div className="coverage-list">
                  <div><span>Primary store</span><strong>MySQL</strong></div>
                  <div><span>Queue backend</span><strong>Redis jobs</strong></div>
                  <div><span>Data sources</span><strong>CSV, API, DB sync</strong></div>
                  <div><span>API status</span><strong className={`health health-${health.status}`}>{health.label}</strong></div>
                </div>
              </section>

              <section className="context-panel">
                <div className="section-header compact">
                  <div>
                    <p className="eyebrow">Filters</p>
                    <h3>Cross-Dashboard Coverage</h3>
                  </div>
                </div>
                <div className="limit-bars">
                  <div><span><strong>Date range</strong><small>Daily, weekly, monthly, quarterly, yearly</small></span><i style={{ width: '92%' }} /></div>
                  <div><span><strong>Customer and fund type</strong><small>New, returning, inflow, rollover</small></span><i style={{ width: '84%' }} /></div>
                  <div><span><strong>Manager and source filters</strong><small>RM, source channel, data source</small></span><i style={{ width: '76%' }} /></div>
                </div>
              </section>

              <section className="context-panel activity-panel">
                <div className="section-header compact">
                  <div>
                    <p className="eyebrow">Logs</p>
                    <h3>Recent Audit And Integration Events</h3>
                  </div>
                </div>
                <div className="activity-list">
                  {activityItems.map((item) => (
                    <div key={`${item.time}-${item.title}`} className="activity-item">
                      <time>{item.time}</time>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
