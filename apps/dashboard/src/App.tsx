import { type ReactNode, useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

declare const __APP_API_BASE_URL__: string | undefined;

const API_BASE_URL =
  typeof __APP_API_BASE_URL__ !== 'undefined'
    ? __APP_API_BASE_URL__
    : import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

type HealthState = {
  status: 'idle' | 'ready' | 'degraded';
  label: string;
  details: string;
};

type Tone = 'neutral' | 'good' | 'warn';

type NavItem = {
  label: string;
  icon: IconName;
  view: ViewId;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type Metric = {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  delta: string;
  icon: IconName;
};

type ReportExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

type ReportExportType = 'summary' | 'trends' | 'customer_portfolio' | 'wealth_manager' | 'upload_error' | 'audit';

type ReportOutputFormat = 'csv' | 'xlsx' | 'pdf';

type ReportExportItem = {
  id: string;
  reportType: ReportExportType;
  outputFormat: ReportOutputFormat;
  requestedBy: string;
  status: ReportExportStatus;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type ReportsOverviewState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ReportExportItem[];
  error: string | null;
};

type RequestState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string | null;
};

type SummaryOverview = {
  totalInvestment: number;
  uniqueCustomers: number;
  investmentCount: number;
  averageInvestmentPerRecord: number;
  averageInvestmentPerCustomer: number;
  newCustomers: {
    customerCount: number;
    investmentValue: number;
  };
  returningCustomers: {
    customerCount: number;
    investmentValue: number;
  };
  inflowFunds: {
    investmentCount: number;
    investmentValue: number;
  };
  rolloverFunds: {
    investmentCount: number;
    investmentValue: number;
  };
  fundTypeSplit: {
    inflowShare: number;
    rolloverShare: number;
  };
  tenorBreakdown: Array<{
    tenorCategory: string;
    label: string;
    investmentValue: number;
    investmentCount: number;
  }>;
  highestContribution: {
    customerId: string;
    customerName: string;
    investmentAmount: number;
    mobilisationDate: string;
  } | null;
  averageCostOfFunds: number | null;
};

type TrendSeriesPoint = {
  period: string;
  totalInvestment: number;
  investmentCount: number;
};

type TrendBreakdownPoint = {
  period: string;
  newCustomerInvestment: number;
  returningCustomerInvestment: number;
  inflowInvestment: number;
  rolloverInvestment: number;
  shortTermInvestment: number;
  midShortTermInvestment: number;
  mediumTermInvestment: number;
  longTermInvestment: number;
  uniqueCustomers: number;
  newCustomerCount: number;
  returningCustomerCount: number;
};

type TrendsOverview = {
  daily: TrendSeriesPoint[];
  weekly: TrendSeriesPoint[];
  monthly: TrendSeriesPoint[];
  quarterly: TrendSeriesPoint[];
  yearly: TrendSeriesPoint[];
  trendBreakdown: {
    daily: TrendBreakdownPoint[];
    weekly: TrendBreakdownPoint[];
    monthly: TrendBreakdownPoint[];
  };
};

type CustomerStatus = 'all' | 'new' | 'returning';

type PortfolioCustomer = {
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';
  totalInvestment: number;
  investmentCount: number;
  inflowValue: number;
  rolloverValue: number;
  lastInvestmentAmount: number;
  lastInvestmentDate: string;
  contributionPercentage: number;
  tenorExposure: Record<string, number>;
};

type CustomerPortfolioOverview = {
  items: PortfolioCustomer[];
};

type InvestmentRecordItem = {
  id: string;
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';
  mobilisationDate: string;
  investmentAmount: string;
  fundType: 'inflow' | 'rollover';
  tenorDays: number;
  tenorCategory: 'short_term' | 'mid_short_term' | 'medium_term' | 'long_term' | 'unclassified';
  maturityDate: string | null;
  investmentReference: string | null;
  currency: string;
  sourceChannel: string | null;
  relationshipManager: string | null;
  costOfFunds: string | null;
  dataSource: 'csv_upload' | 'api_sync' | 'db_sync';
  importStatus: 'pending' | 'confirmed' | 'rejected' | 'archived';
  recordStatus: 'valid' | 'invalid' | 'duplicate' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type InvestmentsOverview = {
  items: InvestmentRecordItem[];
  count: number;
  nextCursor: string | null;
  summary: {
    recordCount: number;
    totalInvestment: number;
    confirmedValidCount: number;
  };
};

type WealthManagerRecord = {
  relationshipManager: string;
  investmentAccountCount: number;
  totalAum: number;
  totalInvestment: number;
  customerCount: number;
  ntbMetrics: {
    customerCount: number;
    volume: number;
  };
  newCustomerMobilisation: {
    customerCount: number;
    investmentValue: number;
  };
  returningCustomerMetrics: {
    customerCount: number;
    volume: number;
  };
  returningCustomerMobilisation: {
    customerCount: number;
    investmentValue: number;
  };
  inflowValue: number;
  rolloverValue: number;
  averageInvestmentPerCustomer: number;
  fundsAging: FundsAgingBuckets;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalInvestment: number;
  }>;
};

type FundsAgingBucket = {
  investmentCount: number;
  investmentValue: number;
};

type FundsAgingBuckets = {
  days0To90: FundsAgingBucket;
  days120To210: FundsAgingBucket;
  days240To330: FundsAgingBucket;
  days366Plus: FundsAgingBucket;
  unclassified: FundsAgingBucket;
};

type WealthManagersOverview = {
  summary: {
    managerCount: number;
    investmentAccountCount: number;
    totalAum: number;
    ntbCustomerCount: number;
    ntbVolume: number;
    returningCustomerCount: number;
    returningCustomerVolume: number;
    fundsAging: FundsAgingBuckets;
  };
  items: WealthManagerRecord[];
};

type UploadHistoryItem = {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'validated' | 'failed' | 'imported' | 'partially_imported' | 'cancelled';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  skippedRows: number;
  createdAt: string;
  completedAt: string | null;
  errorFileUrl: string | null;
};

type UploadHistoryOverview = {
  items: UploadHistoryItem[];
  count: number;
};

type AuditLogItem = {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: 'success' | 'failed' | 'partial_success';
  createdAt: string;
};

type AuditOverview = {
  items: AuditLogItem[];
  count: number;
};

type IntegrationItem = {
  id: string;
  name: string;
  sourceType: 'api' | 'database';
  status: 'active' | 'inactive' | 'failed';
  syncFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  lastTestedAt: string | null;
  lastSuccessfulSyncAt: string | null;
};

type IntegrationsOverview = {
  items: IntegrationItem[];
  count: number;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
};

type UsersOverview = {
  items: UserItem[];
  count: number;
};

type SystemSettingItem = {
  id: string;
  settingKey: string;
  description: string | null;
  isSensitive: boolean;
};

type TenorBandItem = {
  id: string;
  code: string;
  label: string;
  minDays: number;
  maxDays: number;
  status: 'active' | 'inactive';
};

type SourceChannelItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
};

type SettingsOverview = {
  settings: SystemSettingItem[];
  tenorBands: TenorBandItem[];
  sourceChannels: SourceChannelItem[];
};

type ViewId =
  | 'summary'
  | 'trends'
  | 'portfolio'
  | 'investments'
  | 'wealth-managers'
  | 'uploads'
  | 'reports'
  | 'audit'
  | 'integrations'
  | 'users'
  | 'settings';

type ViewDefinition = {
  id: ViewId;
  label: string;
  title: string;
  badge: string;
  heroTitle: string;
  heroDescription: string;
  actionLabel: string;
  secondaryActionLabel: string;
  periodLabel: string;
  statusLabel: string;
};

type ListRow = {
  primary: string;
  secondary: string;
  meta: string;
};

type Notice = {
  tone: 'good' | 'warn';
  message: string;
};

type DialogIntent = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
};

type RangeOption = '7D' | '30D' | 'Quarter' | 'YTD';

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
  | 'spark'
  | 'filter'
  | 'calendar'
  | 'plus'
  | 'refresh'
  | 'clock'
  | 'launch'
  | 'mail'
  | 'sun'
  | 'moon';

const rangeOptions: RangeOption[] = ['7D', '30D', 'Quarter', 'YTD'];

const customerTabs: Array<{ id: CustomerStatus; label: string }> = [
  { id: 'all', label: 'All customers' },
  { id: 'new', label: 'New customers' },
  { id: 'returning', label: 'Returning customers' },
];

const dashboardRequestHeaders = {
  'x-actor-id': '44444444-4444-7444-8444-444444444444',
  'x-actor-type': 'admin',
  'x-permissions': [
    'dashboard.summary.read',
    'dashboard.trends.read',
    'dashboard.customer_portfolio.read',
    'dashboard.wealth_manager.read',
    'uploads.history.read',
    'audit.logs.read',
    'integrations.read',
    'users.read',
    'settings.update',
    'reports.export',
  ].join(','),
};

const reportTypeLabels: Record<ReportExportType, string> = {
  summary: 'Summary',
  trends: 'Trends',
  customer_portfolio: 'Portfolio',
  wealth_manager: 'Manager',
  upload_error: 'Upload Error',
  audit: 'Audit',
};

const chartToneColors = {
  brand: '#E31937',
  brandSoft: '#FDE8EC',
  good: '#059642',
  warn: '#CA8A04',
  muted: '#8891A5',
};

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `NGN ${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (absolute >= 1_000_000) {
    return `NGN ${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `NGN ${(value / 1_000).toFixed(1)}K`;
  }

  return `NGN ${value.toFixed(0)}`;
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-NG').format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return `${value.toFixed(1)}%`;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCustomerType(value: 'new' | 'returning'): string {
  return value === 'new' ? 'New' : 'Returning';
}

function formatTenorLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getLeadingTenor(tenorExposure: Record<string, number>): { label: string; value: number } {
  const entries = Object.entries(tenorExposure);

  if (entries.length === 0) {
    return { label: 'Unclassified', value: 0 };
  }

  const [key, value] = entries.sort((left, right) => right[1] - left[1])[0];
  return {
    label: formatTenorLabel(key),
    value,
  };
}

const navigationItems: NavItem[] = [
  { label: 'Overview', icon: 'grid', view: 'summary' },
  { label: 'Trends', icon: 'chart', view: 'trends' },
  { label: 'Customers', icon: 'wallet', view: 'portfolio' },
  { label: 'Investments', icon: 'database', view: 'investments' },
  { label: 'Managers', icon: 'users', view: 'wealth-managers' },
  { label: 'Uploads', icon: 'briefcase', view: 'uploads' },
  { label: 'Reports', icon: 'file', view: 'reports' },
  { label: 'Sync', icon: 'database', view: 'integrations' },
  { label: 'Audit', icon: 'shield', view: 'audit' },
  { label: 'Team', icon: 'users', view: 'users' },
  { label: 'Settings', icon: 'settings', view: 'settings' },
];

const navigationSections: NavSection[] = [
  {
    title: 'Dashboards',
    items: navigationItems.filter((item) => ['summary', 'trends', 'portfolio', 'investments', 'wealth-managers'].includes(item.view)),
  },
  {
    title: 'Operations',
    items: navigationItems.filter((item) => ['uploads', 'reports', 'integrations'].includes(item.view)),
  },
  {
    title: 'Governance',
    items: navigationItems.filter((item) => ['audit', 'users'].includes(item.view)),
  },
  {
    title: 'System',
    items: navigationItems.filter((item) => item.view === 'settings'),
  },
];

const views: ViewDefinition[] = [
  {
    id: 'summary',
    label: 'Overview',
    title: 'Overview',
    badge: 'KPI',
    heroTitle: 'Standard portfolio metrics.',
    heroDescription: 'Core business metrics only.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Refresh',
    periodLabel: '30D window',
    statusLabel: 'Live',
  },
  {
    id: 'trends',
    label: 'Trends',
    title: 'Trends',
    badge: 'Trend',
    heroTitle: 'Customer movement over time.',
    heroDescription: 'Trend metrics only.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Snapshot',
    periodLabel: '30D window',
    statusLabel: 'Live',
  },
  {
    id: 'portfolio',
    label: 'Customers',
    title: 'Customers',
    badge: 'Book',
    heroTitle: 'Customer book.',
    heroDescription: 'Customer list and balances.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Top 10',
    periodLabel: '1,284 customers',
    statusLabel: 'Live',
  },
  {
    id: 'investments',
    label: 'Investments',
    title: 'Investments',
    badge: 'Ledger',
    heroTitle: 'Investment records.',
    heroDescription: 'Database ledger.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Refresh',
    periodLabel: 'Latest records',
    statusLabel: 'Live',
  },
  {
    id: 'wealth-managers',
    label: 'WEALTH Managers',
    title: 'WEALTH Managers',
    badge: 'RM',
    heroTitle: 'WEALTH manager performance.',
    heroDescription: 'AUM, customer mix, and funds aging by relationship manager.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Refresh',
    periodLabel: 'Manager AUM view',
    statusLabel: 'Live',
  },
  {
    id: 'uploads',
    label: 'Uploads',
    title: 'Uploads',
    badge: 'Operations',
    heroTitle: 'Upload queue.',
    heroDescription: 'Upload operations.',
    actionLabel: 'Upload CSV',
    secondaryActionLabel: 'Errors',
    periodLabel: '12 files today',
    statusLabel: 'Review',
  },
  {
    id: 'reports',
    label: 'Reports',
    title: 'Reports',
    badge: 'Exports',
    heroTitle: 'Export queue.',
    heroDescription: 'Report operations.',
    actionLabel: 'Create',
    secondaryActionLabel: 'Queue',
    periodLabel: '42 delivered',
    statusLabel: 'Processing',
  },
  {
    id: 'audit',
    label: 'Audit',
    title: 'Audit',
    badge: 'Governance',
    heroTitle: 'Audit trail.',
    heroDescription: 'Governance records.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Critical',
    periodLabel: '2,418 events',
    statusLabel: 'Ready',
  },
  {
    id: 'integrations',
    label: 'Sync',
    title: 'Sync',
    badge: 'Sync',
    heroTitle: 'Integration status.',
    heroDescription: 'Sync operations.',
    actionLabel: 'Run Sync',
    secondaryActionLabel: 'Failures',
    periodLabel: '96.2% success',
    statusLabel: 'Live',
  },
  {
    id: 'users',
    label: 'Team',
    title: 'Team',
    badge: 'Access',
    heroTitle: 'Access control.',
    heroDescription: 'Team access.',
    actionLabel: 'Invite User',
    secondaryActionLabel: 'Permissions',
    periodLabel: '14 active users',
    statusLabel: 'Protected',
  },
  {
    id: 'settings',
    label: 'Settings',
    title: 'Settings',
    badge: 'Configuration',
    heroTitle: 'System settings.',
    heroDescription: 'Platform settings.',
    actionLabel: 'Save',
    secondaryActionLabel: 'Change Log',
    periodLabel: 'Admin only',
    statusLabel: 'Review',
  },
];


const panelCopyByView: Record<ViewId, { title: string; description: string }> = {
  summary: { title: 'Executive Watchlist', description: 'Curated signals that deserve follow-up in the next operating review.' },
  trends: { title: 'Trend Interpretation', description: 'Keep current movement, volatility, and leading indicators visible beside the primary chart table.' },
  portfolio: { title: 'Customer Detail Notes', description: 'Compact context blocks help relationship teams assess concentration, recency, and next-best action.' },
  investments: { title: 'Ledger Review', description: 'Inspect record-level investment data, source status, and maturity timing from the database.' },
  'wealth-managers': { title: 'Manager Coaching Notes', description: 'Use the page to flag concentration, customer growth, and recovery opportunities by RM.' },
  uploads: { title: 'Validation Workflow', description: 'The workflow is grouped clearly so operational steps do not collapse into one crowded card.' },
  reports: { title: 'Delivery Controls', description: 'Report scheduling, format, and queue visibility stay grouped in one consistent workbench.' },
  audit: { title: 'Review Guidance', description: 'Critical events, owners, and retention coverage remain visible during governance review.' },
  integrations: { title: 'Source Recovery Plan', description: 'Surface retry priorities, mapping concerns, and next sync timing without leaving the page.' },
  users: { title: 'Access Administration', description: 'Group invite actions, role assignment, and review context in a single maintainable section.' },
  settings: { title: 'Configuration Workspace', description: 'Group related controls into cards with helper text and safer save actions.' },
};

const emptyStateCopyByView: Record<ViewId, { title: string; description: string }> = {
  summary: { title: 'No summary signals match that search', description: 'Try a broader keyword to restore the executive overview rows.' },
  trends: { title: 'No trend rows match that search', description: 'Use a broader search term or reset filters to inspect the full trend set.' },
  portfolio: { title: 'No customers match that search', description: 'Search by another customer name or ID to restore the ranked portfolio list.' },
  investments: { title: 'No investment records match that search', description: 'Search by customer, reference, source channel, or relationship manager.' },
  'wealth-managers': { title: 'No managers match that search', description: 'Clear the current search to recover the full relationship-manager leaderboard.' },
  uploads: { title: 'No upload records match that search', description: 'Reset the filters to review pending batches and error reports.' },
  reports: { title: 'No report jobs match that search', description: 'Try another keyword to bring queued and completed exports back into view.' },
  audit: { title: 'No audit entries match that search', description: 'Use a broader term to recover critical and admin events.' },
  integrations: { title: 'No integration records match that search', description: 'Reset the search to inspect source status and retry candidates.' },
  users: { title: 'No user groups match that search', description: 'Clear the search to restore role and account segments.' },
  settings: { title: 'No configuration groups match that search', description: 'Try another keyword or reset the search to restore all setting groups.' },
};

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

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
    spark: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    filter: <><path d="M4 5h16" /><path d="M7 12h10" /><path d="M10 19h4" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.9 3" /><path d="M20 20v-5h-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
    launch: <><path d="M14 5h5v5" /><path d="M10 14 19 5" /><path d="M19 14v5h-14v-14h5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  };

  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function getToneFromMeta(meta: string): Tone {
  const value = meta.toLowerCase();

  if (value.includes('critical') || value.includes('retry') || value.includes('review') || value.includes('action required') || value.includes('watch') || value.includes('invalid') || value.includes('rejected') || value.includes('duplicate')) {
    return 'warn';
  }

  if (value.includes('healthy') || value.includes('completed') || value.includes('top') || value.includes('on track') || value.includes('stable')) {
    return 'good';
  }

  return 'neutral';
}

function getActionLabel(view: ViewId): string {
  switch (view) {
    case 'uploads':
      return 'Review batch';
    case 'reports':
      return 'Open report';
    case 'integrations':
      return 'Inspect sync';
    case 'users':
      return 'Manage access';
    case 'settings':
      return 'Open settings';
    default:
      return 'View details';
  }
}

function getSearchPlaceholder(view: ViewId): string {
  switch (view) {
    case 'summary':
    case 'trends':
    case 'portfolio':
      return 'Search customer';
    case 'investments':
      return 'Search investments';
    case 'wealth-managers':
      return 'Search customer or RM';
    case 'uploads':
      return 'Search batch';
    case 'audit':
      return 'Search audit';
    case 'integrations':
      return 'Search source';
    case 'users':
      return 'Search team';
    case 'settings':
      return 'Search settings';
    default:
      return 'Search';
  }
}

function getCustomerTabCount(customers: PortfolioCustomer[], tab: CustomerStatus): number {
  if (tab === 'all') {
    return customers.length;
  }

  return customers.filter((customer) => customer.customerType === tab).length;
}

function getFundsAgingDisplayItems(buckets: FundsAgingBuckets | undefined): Array<{ key: keyof FundsAgingBuckets; label: string; value: number; count: number }> {
  return [
    {
      key: 'days0To90',
      label: '0 - 90 days',
      value: buckets?.days0To90.investmentValue ?? 0,
      count: buckets?.days0To90.investmentCount ?? 0,
    },
    {
      key: 'days120To210',
      label: '120 - 210 days',
      value: buckets?.days120To210.investmentValue ?? 0,
      count: buckets?.days120To210.investmentCount ?? 0,
    },
    {
      key: 'days240To330',
      label: '240 - 330 days',
      value: buckets?.days240To330.investmentValue ?? 0,
      count: buckets?.days240To330.investmentCount ?? 0,
    },
    {
      key: 'days366Plus',
      label: '366+ days',
      value: buckets?.days366Plus.investmentValue ?? 0,
      count: buckets?.days366Plus.investmentCount ?? 0,
    },
  ];
}

function getDominantFundsAgingBucket(buckets: FundsAgingBuckets): { label: string; value: number } {
  return getFundsAgingDisplayItems(buckets).reduce(
    (highest, item) => (item.value > highest.value ? { label: item.label, value: item.value } : highest),
    { label: 'No classified bucket', value: 0 },
  );
}

function formatReportType(reportType: ReportExportType): string {
  return reportTypeLabels[reportType];
}

function formatOutputFormat(outputFormat: ReportOutputFormat): string {
  return outputFormat.toUpperCase();
}

function formatReportTime(value: string | null): string {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDurationMinutes(start: string, end: string | null): number | null {
  if (!end) {
    return null;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function filterReportsByRange(items: ReportExportItem[], range: RangeOption): ReportExportItem[] {
  const now = new Date();
  const lowerBound = new Date(now);

  if (range === '7D') {
    lowerBound.setDate(now.getDate() - 6);
  } else if (range === '30D') {
    lowerBound.setDate(now.getDate() - 29);
  } else if (range === 'Quarter') {
    lowerBound.setMonth(now.getMonth() - 2, 1);
  } else {
    lowerBound.setMonth(0, 1);
  }

  lowerBound.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    const createdAt = new Date(item.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= lowerBound;
  });
}

function buildReportTrendData(items: ReportExportItem[], range: RangeOption): Array<{ label: string; value: number }> {
  const now = new Date();

  if (range === '7D') {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString([], { weekday: 'short' }),
      };
    });

    return buckets.map((bucket) => ({
      label: bucket.label,
      value: items.filter((item) => item.createdAt.slice(0, 10) === bucket.key).length,
    }));
  }

  if (range === '30D') {
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (29 - index * 5));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      end.setHours(23, 59, 59, 999);

      return {
        label: `W${index + 1}`,
        value: items.filter((item) => {
          const createdAt = new Date(item.createdAt);
          return createdAt >= start && createdAt <= end;
        }).length,
      };
    });
  }

  const monthCount = range === 'Quarter' ? 3 : now.getMonth() + 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), range === 'Quarter' ? now.getMonth() - (2 - index) : index, 1);
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();

    return {
      label: monthDate.toLocaleDateString([], { month: 'short' }),
      value: items.filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt.getMonth() === month && createdAt.getFullYear() === year;
      }).length,
    };
  });
}

function App() {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    Dashboards: false,
    Operations: false,
    Governance: false,
    System: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aumPeriod, setAumPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [ntbPeriod, setNtbPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [returningPeriod, setReturningPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [trendsFrom, setTrendsFrom] = useState('');
  const [trendsTo, setTrendsTo] = useState('');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wt-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedUploadName, setSelectedUploadName] = useState('');
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [isLoadingMoreInvestments, setIsLoadingMoreInvestments] = useState(false);
  const [reportsOverview, setReportsOverview] = useState<ReportsOverviewState>({
    status: 'idle',
    items: [],
    error: null,
  });
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    label: 'Checking API readiness',
    details: API_BASE_URL,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Map URL path to ViewId
  const currentView = useMemo<ViewId>(() => {
    const pathMap: Record<string, ViewId> = {
      '/': 'portfolio',
      '/summary': 'summary',
      '/trends': 'trends',
      '/portfolio': 'portfolio',
      '/investments': 'investments',
      '/wealth-managers': 'wealth-managers',
      '/uploads': 'uploads',
      '/reports': 'reports',
      '/audit': 'audit',
      '/integrations': 'integrations',
      '/users': 'users',
      '/settings': 'settings',
    };
    return pathMap[location.pathname] ?? 'portfolio';
  }, [location.pathname]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomerStatus, setActiveCustomerStatus] = useState<CustomerStatus>('all');
  const [activeRange, setActiveRange] = useState<RangeOption>('30D');
  const [dialogIntent, setDialogIntent] = useState<DialogIntent | null>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summaryOverview, setSummaryOverview] = useState<RequestState<SummaryOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [trendsOverview, setTrendsOverview] = useState<RequestState<TrendsOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [portfolioOverview, setPortfolioOverview] = useState<RequestState<CustomerPortfolioOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [investmentsOverview, setInvestmentsOverview] = useState<RequestState<InvestmentsOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [wealthManagersOverview, setWealthManagersOverview] = useState<RequestState<WealthManagersOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [uploadsOverview, setUploadsOverview] = useState<RequestState<UploadHistoryOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [auditOverview, setAuditOverview] = useState<RequestState<AuditOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [integrationsOverview, setIntegrationsOverview] = useState<RequestState<IntegrationsOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [usersOverview, setUsersOverview] = useState<RequestState<UsersOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [settingsOverview, setSettingsOverview] = useState<RequestState<SettingsOverview>>({
    status: 'idle',
    data: null,
    error: null,
  });

  async function fetchViewData<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/${path}`, {
      headers: dashboardRequestHeaders,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth(): Promise<void> {
      setHealth({
        status: 'idle',
        label: 'Checking API readiness',
        details: API_BASE_URL,
      });

      try {
        const response = await fetch(`${API_BASE_URL}/health/ready`);
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
          details: `${API_BASE_URL} · ${message}`,
        });
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setNotice(null);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [notice]);

  useEffect(() => {
    if (currentView !== 'reports') {
      return undefined;
    }

    let cancelled = false;

    async function loadReports(): Promise<void> {
      setReportsOverview((current) => ({
        status: current.items.length > 0 ? 'ready' : 'loading',
        items: current.items,
        error: null,
      }));

      try {
        const response = await fetch(`${API_BASE_URL}/reports`, {
          headers: dashboardRequestHeaders,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { items?: ReportExportItem[] };

        if (cancelled) {
          return;
        }

        setReportsOverview({
          status: 'ready',
          items: payload.items ?? [],
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown error';
        setReportsOverview((current) => ({
          status: 'error',
          items: current.items,
          error: message,
        }));
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [currentView, reportsRefreshKey]);

  useEffect(() => {
    if (!['summary', 'trends'].includes(currentView) || summaryOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setSummaryOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<SummaryOverview>('dashboard/summary')
      .then((data) => {
        if (!cancelled) {
          setSummaryOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaryOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'trends') {
      return undefined;
    }

    let cancelled = false;
    setTrendsOverview({ status: 'loading', data: null, error: null });

    const params = new URLSearchParams();
    if (trendsFrom) params.set('from', trendsFrom);
    if (trendsTo) params.set('to', trendsTo);
    const qs = params.toString();

    void fetchViewData<TrendsOverview>(`dashboard/trends${qs ? `?${qs}` : ''}`)
      .then((data) => {
        if (!cancelled) {
          setTrendsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTrendsOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, trendsFrom, trendsTo]);

  useEffect(() => {
    if (currentView !== 'portfolio' || portfolioOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setPortfolioOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<CustomerPortfolioOverview>('dashboard/customer-portfolio')
      .then((data) => {
        if (!cancelled) {
          setPortfolioOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPortfolioOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'investments' || investmentsOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setInvestmentsOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<InvestmentsOverview>('investments?limit=50')
      .then((data) => {
        if (!cancelled) {
          setInvestmentsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInvestmentsOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'wealth-managers' || wealthManagersOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setWealthManagersOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<WealthManagersOverview>('dashboard/wealth-managers')
      .then((data) => {
        if (!cancelled) {
          setWealthManagersOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWealthManagersOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'uploads' || uploadsOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setUploadsOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<UploadHistoryOverview>('uploads/history')
      .then((data) => {
        if (!cancelled) {
          setUploadsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setUploadsOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'audit' || auditOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setAuditOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<AuditOverview>('audit-logs')
      .then((data) => {
        if (!cancelled) {
          setAuditOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAuditOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'integrations' || integrationsOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setIntegrationsOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<IntegrationsOverview>('integrations')
      .then((data) => {
        if (!cancelled) {
          setIntegrationsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setIntegrationsOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'users' || usersOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setUsersOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<UsersOverview>('users')
      .then((data) => {
        if (!cancelled) {
          setUsersOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setUsersOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'settings' || settingsOverview.status !== 'idle') {
      return undefined;
    }

    let cancelled = false;
    setSettingsOverview({ status: 'loading', data: null, error: null });

    void fetchViewData<SettingsOverview>('settings')
      .then((data) => {
        if (!cancelled) {
          setSettingsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSettingsOverview({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const currentDefinition = views.find((view) => view.id === currentView) ?? views[0];
  const summaryData = summaryOverview.data;
  const trendsData = trendsOverview.data;
  const portfolioItems = portfolioOverview.data?.items ?? [];
  const investmentItems = investmentsOverview.data?.items ?? [];
  const investmentSummary = investmentsOverview.data?.summary;
  const wealthManagerItems = wealthManagersOverview.data?.items ?? [];
  const uploadItems = uploadsOverview.data?.items ?? [];
  const auditItems = auditOverview.data?.items ?? [];
  const integrationItems = integrationsOverview.data?.items ?? [];
  const userItems = usersOverview.data?.items ?? [];
  const settingsData = settingsOverview.data;
  const reportItemsInRange = filterReportsByRange(reportsOverview.items, activeRange);
  const reportRows: ListRow[] = reportItemsInRange.map((item) => {
    const statusLabel = item.status === 'pending' ? 'Queued' : item.status.charAt(0).toUpperCase() + item.status.slice(1);
    const completion = item.completedAt ? `Completed ${formatReportTime(item.completedAt)}` : `Created ${formatReportTime(item.createdAt)}`;

    return {
      primary: `${formatReportType(item.reportType)} ${formatOutputFormat(item.outputFormat)}`,
      secondary: `${completion} • ${item.fileSizeBytes ? `${Math.round(item.fileSizeBytes / 1024)} KB` : 'File pending'}${item.errorMessage ? ` • ${item.errorMessage}` : ''}`,
      meta: statusLabel,
    };
  });

  const currentMetrics: Metric[] = (() => {
    if (currentView === 'summary') {
      return [
        {
          label: 'Total Mobilised',
          value: formatCurrency(summaryData?.totalInvestment),
          helper: 'Confirmed valid investments',
          tone: 'good',
          delta: summaryData ? `${formatCount(summaryData.investmentCount)} confirmed records` : 'Loading live data',
          icon: 'wallet',
        },
        {
          label: 'Customers',
          value: formatCount(summaryData?.uniqueCustomers),
          helper: 'Distinct customer IDs',
          tone: 'neutral',
          delta: summaryData ? `${formatCount(summaryData.newCustomers.customerCount)} new / ${formatCount(summaryData.returningCustomers.customerCount)} returning` : 'Loading live data',
          icon: 'users',
        },
        {
          label: 'Fund Mix',
          value: summaryData ? `${summaryData.fundTypeSplit.inflowShare.toFixed(0)}% inflow` : '--',
          helper: 'Inflow vs rollover share',
          tone: 'good',
          delta: summaryData ? `${formatCurrency(summaryData.inflowFunds.investmentValue)} inflow • ${formatCurrency(summaryData.rolloverFunds.investmentValue)} rollover` : 'Loading live data',
          icon: 'spark',
        },
        {
          label: 'Average Ticket',
          value: formatCurrency(summaryData?.averageInvestmentPerRecord),
          helper: 'Average per investment record',
          tone: 'neutral',
          delta: summaryData ? `${formatCurrency(summaryData.averageInvestmentPerCustomer)} per customer` : 'Loading live data',
          icon: 'chart',
        },
      ];
    }

    if (currentView === 'trends') {
      return [
        {
          label: 'AUM Investments',
          value: formatCount(summaryData?.investmentCount),
          helper: 'Confirmed investment count',
          tone: 'good',
          delta: summaryData ? `${formatCount(summaryData.uniqueCustomers)} customers` : 'Loading live data',
          icon: 'briefcase',
        },
        {
          label: 'AUM Volume',
          value: formatCurrency(summaryData?.totalInvestment),
          helper: 'Confirmed investment volume',
          tone: 'good',
          delta: summaryData ? `${formatCurrency(summaryData.averageInvestmentPerRecord)} avg ticket` : 'Loading live data',
          icon: 'wallet',
        },
        {
          label: 'NTB Customers',
          value: formatCount(summaryData?.newCustomers.customerCount),
          helper: 'New-to-Bank customer count',
          tone: 'neutral',
          delta: summaryData ? `${formatPercent(summaryData.uniqueCustomers ? (summaryData.newCustomers.customerCount / summaryData.uniqueCustomers) * 100 : 0)} of customers` : 'Loading live data',
          icon: 'users',
        },
        {
          label: 'NTB Volume',
          value: formatCurrency(summaryData?.newCustomers.investmentValue),
          helper: 'New-to-Bank customer volume',
          tone: 'neutral',
          delta: summaryData ? `${formatCurrency(summaryData.newCustomers.investmentValue / Math.max(summaryData.newCustomers.customerCount, 1))} avg/customer` : 'Loading live data',
          icon: 'spark',
        },
        {
          label: 'Returning Customers',
          value: formatCount(summaryData?.returningCustomers.customerCount),
          helper: 'Returning customer count',
          tone: 'neutral',
          delta: summaryData ? `${formatPercent(summaryData.uniqueCustomers ? (summaryData.returningCustomers.customerCount / summaryData.uniqueCustomers) * 100 : 0)} of customers` : 'Loading live data',
          icon: 'users',
        },
        {
          label: 'Returning Volume',
          value: formatCurrency(summaryData?.returningCustomers.investmentValue),
          helper: 'Returning customer volume',
          tone: 'good',
          delta: summaryData ? `${formatCurrency(summaryData.returningCustomers.investmentValue / Math.max(summaryData.returningCustomers.customerCount, 1))} avg/customer` : 'Loading live data',
          icon: 'wallet',
        },
      ];
    }

    if (currentView === 'portfolio') {
      const topCustomer = portfolioItems[0];
      const totalBook = portfolioItems.reduce((sum, customer) => sum + customer.totalInvestment, 0);
      const newBook = portfolioItems.filter((customer) => customer.customerType === 'new').reduce((sum, customer) => sum + customer.totalInvestment, 0);

      return [
        {
          label: 'Customer Book',
          value: formatCurrency(totalBook),
          helper: 'Confirmed customer mobilisation',
          tone: 'good',
          delta: `${formatCount(portfolioItems.length)} customers`,
          icon: 'wallet',
        },
        {
          label: 'Top Customer',
          value: formatCurrency(topCustomer?.totalInvestment),
          helper: 'Largest customer contribution',
          tone: 'neutral',
          delta: topCustomer ? topCustomer.customerName : 'Loading live data',
          icon: 'users',
        },
        {
          label: 'New Customer Book',
          value: formatCurrency(newBook),
          helper: 'Mobilised from new customers',
          tone: 'good',
          delta: `${formatCount(portfolioItems.filter((customer) => customer.customerType === 'new').length)} customers`,
          icon: 'spark',
        },
        {
          label: 'Avg Customer Book',
          value: portfolioItems.length > 0 ? formatCurrency(totalBook / portfolioItems.length) : '--',
          helper: 'Average per customer',
          tone: 'neutral',
          delta: 'Ranked by contribution share',
          icon: 'chart',
        },
      ];
    }

    if (currentView === 'investments') {
      const confirmedVisible = investmentItems.filter((item) => item.recordStatus === 'valid' && item.importStatus === 'confirmed').length;
      const maturingVisible = investmentItems.filter((item) => {
        if (!item.maturityDate) {
          return false;
        }

        const maturityDate = new Date(item.maturityDate);
        const now = new Date();
        const thirtyDays = new Date(now);
        thirtyDays.setDate(now.getDate() + 30);

        return maturityDate >= now && maturityDate <= thirtyDays;
      }).length;

      return [
        {
          label: 'Investment Value',
          value: formatCurrency(investmentSummary?.totalInvestment),
          helper: 'Total matching database records',
          tone: 'good',
          delta: `${formatCount(investmentSummary?.recordCount)} records`,
          icon: 'wallet',
        },
        {
          label: 'Confirmed Valid',
          value: formatCount(investmentSummary?.confirmedValidCount),
          helper: 'Confirmed valid ledger records',
          tone: 'good',
          delta: `${formatCount(confirmedVisible)} visible on this page`,
          icon: 'check',
        },
        {
          label: 'Visible Page',
          value: formatCount(investmentItems.length),
          helper: 'Latest records loaded',
          tone: 'neutral',
          delta: investmentsOverview.data?.nextCursor ? 'More records available' : 'End of current result set',
          icon: 'database',
        },
        {
          label: 'Maturing Soon',
          value: formatCount(maturingVisible),
          helper: 'Visible records due within 30 days',
          tone: maturingVisible > 0 ? 'warn' : 'neutral',
          delta: 'Based on current page',
          icon: 'calendar',
        },
      ];
    }

    if (currentView === 'wealth-managers') {
      const topManager = wealthManagerItems[0];
      const wealthManagerSummary = wealthManagersOverview.data?.summary;
      const summaryAgingItems = getFundsAgingDisplayItems(wealthManagerSummary?.fundsAging);
      const summaryAgingTotal = summaryAgingItems.reduce((sum, item) => sum + item.value, 0);
      const summaryAgingCount = summaryAgingItems.reduce((sum, item) => sum + item.count, 0);
      const dominantAgingBucket = summaryAgingItems.reduce(
        (highest, item) => (item.value > highest.value ? item : highest),
        { key: 'days0To90' as keyof FundsAgingBuckets, label: 'No classified bucket', value: 0, count: 0 },
      );
      const unclassifiedAgingValue = wealthManagerSummary?.fundsAging.unclassified.investmentValue ?? 0;

      return [
        {
          label: 'AUM (Investments)',
          value: formatCurrency(wealthManagerSummary?.totalAum),
          helper: 'Aggregate AUM from confirmed uploaded investment accounts',
          tone: 'good',
          delta: `${formatCount(wealthManagerSummary?.investmentAccountCount)} investment accounts`,
          icon: 'briefcase',
        },
        {
          label: 'New-to-Bank',
          value: formatCurrency(wealthManagerSummary?.ntbVolume),
          helper: 'NTB customer volume',
          tone: 'neutral',
          delta: `${formatCount(wealthManagerSummary?.ntbCustomerCount)} new customers`,
          icon: 'users',
        },
        {
          label: 'Returning Customers',
          value: formatCurrency(wealthManagerSummary?.returningCustomerVolume),
          helper: 'Returning customer volume',
          tone: 'neutral',
          delta: `${formatCount(wealthManagerSummary?.returningCustomerCount)} returning customers`,
          icon: 'wallet',
        },
        {
          label: 'Top WEALTH Manager',
          value: formatCurrency(topManager?.totalAum ?? topManager?.totalInvestment),
          helper: 'Highest AUM owner',
          tone: 'good',
          delta: topManager ? topManager.relationshipManager : 'Loading live data',
          icon: 'spark',
        },
        {
          label: 'Classified Aging',
          value: formatCurrency(summaryAgingTotal),
          helper: 'Funds mapped into tenor aging buckets',
          tone: unclassifiedAgingValue > 0 ? 'warn' : 'neutral',
          delta: `${formatCount(summaryAgingCount)} investments, ${formatCurrency(unclassifiedAgingValue)} unclassified`,
          icon: 'calendar',
        },
        {
          label: 'Dominant Bucket',
          value: dominantAgingBucket.label,
          helper: 'Largest funds-aging bucket by value',
          tone: dominantAgingBucket.value > 0 ? 'good' : 'neutral',
          delta: `${formatCurrency(dominantAgingBucket.value)} across ${formatCount(dominantAgingBucket.count)} investments`,
          icon: 'database',
        },
      ];
    }

    if (currentView === 'uploads') {
      return [
        {
          label: 'Batches',
          value: formatCount(uploadItems.length),
          helper: 'Uploader batch history',
          tone: 'neutral',
          delta: `${formatCount(uploadItems.filter((item) => item.status === 'pending' || item.status === 'processing').length)} in flight`,
          icon: 'briefcase',
        },
        {
          label: 'Validated Rows',
          value: formatCount(uploadItems.reduce((sum, item) => sum + item.validRows, 0)),
          helper: 'Rows cleared for import',
          tone: 'good',
          delta: `${formatCount(uploadItems.reduce((sum, item) => sum + item.totalRows, 0))} total rows`,
          icon: 'check',
        },
        {
          label: 'Rejected Rows',
          value: formatCount(uploadItems.reduce((sum, item) => sum + item.invalidRows, 0)),
          helper: 'Rows blocked by validation',
          tone: 'warn',
          delta: `${formatCount(uploadItems.reduce((sum, item) => sum + item.duplicateRows, 0))} duplicates`,
          icon: 'alert',
        },
        {
          label: 'Imported Batches',
          value: formatCount(uploadItems.filter((item) => item.status === 'imported' || item.status === 'partially_imported').length),
          helper: 'Batches completed into investments',
          tone: 'good',
          delta: `${formatCount(uploadItems.filter((item) => item.status === 'failed').length)} failed`,
          icon: 'refresh',
        },
      ];
    }

    if (currentView === 'audit') {
      return [
        {
          label: 'Audit Events',
          value: formatCount(auditItems.length),
          helper: 'Tracked platform events',
          tone: 'neutral',
          delta: auditItems[0] ? `Latest ${formatDateTime(auditItems[0].createdAt)}` : 'Loading live data',
          icon: 'shield',
        },
        {
          label: 'Failed Actions',
          value: formatCount(auditItems.filter((item) => item.outcome === 'failed').length),
          helper: 'Events with failed outcome',
          tone: 'warn',
          delta: `${formatCount(auditItems.filter((item) => item.outcome === 'partial_success').length)} partial`,
          icon: 'alert',
        },
        {
          label: 'User Actions',
          value: formatCount(auditItems.filter((item) => item.resourceType === 'user').length),
          helper: 'Access and lifecycle changes',
          tone: 'neutral',
          delta: `${formatCount(auditItems.filter((item) => item.resourceType === 'upload_batch').length)} upload actions`,
          icon: 'users',
        },
        {
          label: 'Exportable Trail',
          value: auditItems.length > 0 ? 'Ready' : '--',
          helper: 'Audit trail export readiness',
          tone: 'good',
          delta: 'Backed by immutable log records',
          icon: 'download',
        },
      ];
    }

    if (currentView === 'integrations') {
      return [
        {
          label: 'Sources',
          value: formatCount(integrationItems.length),
          helper: 'Configured intake sources',
          tone: 'neutral',
          delta: `${formatCount(integrationItems.filter((item) => item.status === 'active').length)} active`,
          icon: 'database',
        },
        {
          label: 'Failed Sources',
          value: formatCount(integrationItems.filter((item) => item.status === 'failed').length),
          helper: 'Sources needing intervention',
          tone: 'warn',
          delta: `${formatCount(integrationItems.filter((item) => item.status === 'inactive').length)} inactive`,
          icon: 'alert',
        },
        {
          label: 'API Feeds',
          value: formatCount(integrationItems.filter((item) => item.sourceType === 'api').length),
          helper: 'API-based integration sources',
          tone: 'good',
          delta: `${formatCount(integrationItems.filter((item) => item.sourceType === 'database').length)} database feeds`,
          icon: 'filter',
        },
        {
          label: 'Tested Recently',
          value: formatCount(integrationItems.filter((item) => item.lastTestedAt).length),
          helper: 'Sources with recorded connection tests',
          tone: 'neutral',
          delta: `${formatCount(integrationItems.filter((item) => item.lastSuccessfulSyncAt).length)} have successful syncs`,
          icon: 'refresh',
        },
      ];
    }

    if (currentView === 'users') {
      const uniqueRoles = new Set(userItems.map((item) => item.roleId)).size;

      return [
        {
          label: 'Users',
          value: formatCount(userItems.length),
          helper: 'Provisioned platform users',
          tone: 'neutral',
          delta: `${formatCount(userItems.filter((item) => item.status === 'active').length)} active`,
          icon: 'users',
        },
        {
          label: 'Suspended',
          value: formatCount(userItems.filter((item) => item.status === 'suspended').length),
          helper: 'Restricted user accounts',
          tone: 'warn',
          delta: `${formatCount(userItems.filter((item) => item.status === 'inactive').length)} inactive`,
          icon: 'shield',
        },
        {
          label: 'Roles',
          value: formatCount(uniqueRoles),
          helper: 'Unique RBAC role assignments',
          tone: 'good',
          delta: 'Role IDs returned by user service',
          icon: 'check',
        },
        {
          label: 'Logged In',
          value: formatCount(userItems.filter((item) => item.lastLoginAt).length),
          helper: 'Users with recorded session activity',
          tone: 'neutral',
          delta: 'Audit access reviews from this page',
          icon: 'clock',
        },
      ];
    }

    const sensitiveSettings = settingsData?.settings.filter((item) => item.isSensitive).length ?? 0;

    return [
      {
        label: 'System Settings',
        value: formatCount(settingsData?.settings.length),
        helper: 'Persisted platform settings',
        tone: 'neutral',
        delta: `${formatCount(sensitiveSettings)} sensitive`,
        icon: 'settings',
      },
      {
        label: 'Tenor Bands',
        value: formatCount(settingsData?.tenorBands.filter((item) => item.status === 'active').length),
        helper: 'Active tenor classifications',
        tone: 'good',
        delta: `${formatCount(settingsData?.tenorBands.length)} configured`,
        icon: 'filter',
      },
      {
        label: 'Source Channels',
        value: formatCount(settingsData?.sourceChannels.filter((item) => item.status === 'active').length),
        helper: 'Active investment source channels',
        tone: 'good',
        delta: `${formatCount(settingsData?.sourceChannels.length)} configured`,
        icon: 'mail',
      },
      {
        label: 'Change Control',
        value: settingsData ? 'Admin only' : '--',
        helper: 'Settings endpoint is restricted',
        tone: 'warn',
        delta: 'Review tenor and channel mappings here',
        icon: 'shield',
      },
    ];
  })();

  const currentRows: ListRow[] = (() => {
    if (currentView === 'reports') {
      return reportRows;
    }

    if (currentView === 'summary') {
      const leadTenor = summaryData?.tenorBreakdown.slice().sort((left, right) => right.investmentValue - left.investmentValue)[0];

      return [
        summaryData?.highestContribution
          ? {
              primary: summaryData.highestContribution.customerName,
              secondary: `${formatCurrency(summaryData.highestContribution.investmentAmount)} on ${formatShortDate(summaryData.highestContribution.mobilisationDate)}`,
              meta: 'Top contribution',
            }
          : null,
        summaryData
          ? {
              primary: 'New customer mobilisation',
              secondary: `${formatCurrency(summaryData.newCustomers.investmentValue)} across ${formatCount(summaryData.newCustomers.customerCount)} customers`,
              meta: 'Growth',
            }
          : null,
        summaryData
          ? {
              primary: 'Returning customer mobilisation',
              secondary: `${formatCurrency(summaryData.returningCustomers.investmentValue)} across ${formatCount(summaryData.returningCustomers.customerCount)} customers`,
              meta: 'Retention',
            }
          : null,
        leadTenor
          ? {
              primary: `${leadTenor.label} exposure`,
              secondary: `${formatCurrency(leadTenor.investmentValue)} across ${formatCount(leadTenor.investmentCount)} investments`,
              meta: 'Tenor focus',
            }
          : null,
      ].filter((item): item is ListRow => item !== null);
    }

    if (currentView === 'trends') {
      return (trendsData?.monthly ?? []).slice(-6).reverse().map((item, index) => ({
        primary: `Month ${item.period}`,
        secondary: `${formatCurrency(item.totalInvestment)} from ${formatCount(item.investmentCount)} investments`,
        meta: index === 0 ? 'Current month' : 'Trend point',
      }));
    }

    if (currentView === 'portfolio') {
      return portfolioItems.map((customer) => ({
        primary: customer.customerName,
        secondary: `${formatCurrency(customer.totalInvestment)} • ${formatCustomerType(customer.customerType)} • ${formatCount(customer.investmentCount)} investments • Last ${formatShortDate(customer.lastInvestmentDate)}`,
        meta: `${formatPercent(customer.contributionPercentage)} of book`,
      }));
    }

    if (currentView === 'investments') {
      return investmentItems.map((item) => ({
        primary: item.customerName,
        secondary: `${formatCurrency(Number(item.investmentAmount))} • ${item.fundType} • ${formatTenorLabel(item.tenorCategory)} • Matures ${formatShortDate(item.maturityDate)}`,
        meta: `${item.recordStatus} / ${item.importStatus}`,
      }));
    }

    if (currentView === 'wealth-managers') {
      return wealthManagerItems.map((manager) => ({
        primary: manager.relationshipManager,
        secondary: `${formatCurrency(manager.totalInvestment)} • ${formatCount(manager.customerCount)} customers • ${formatCurrency(manager.inflowValue)} inflow`,
        meta: manager.topCustomers[0] ? `Top customer ${manager.topCustomers[0].customerName}` : 'RM coverage',
      }));
    }

    if (currentView === 'uploads') {
      return uploadItems.map((item) => ({
        primary: item.fileName,
        secondary: `${formatCount(item.validRows)} valid • ${formatCount(item.invalidRows)} invalid • ${formatCount(item.duplicateRows)} duplicates • ${formatShortDate(item.createdAt)}`,
        meta: item.status.replace(/_/g, ' '),
      }));
    }

    if (currentView === 'audit') {
      return auditItems.map((item) => ({
        primary: item.action,
        secondary: `${item.resourceType} ${item.resourceId} • ${item.actorRole} • ${formatDateTime(item.createdAt)}`,
        meta: item.outcome.replace(/_/g, ' '),
      }));
    }

    if (currentView === 'integrations') {
      return integrationItems.map((item) => ({
        primary: item.name,
        secondary: `${item.sourceType} • ${item.syncFrequency} • Last success ${formatDateTime(item.lastSuccessfulSyncAt)}`,
        meta: item.status,
      }));
    }

    if (currentView === 'users') {
      return userItems.map((item) => ({
        primary: item.name,
        secondary: `${item.email} • role ${item.roleId} • Last login ${formatDateTime(item.lastLoginAt)}`,
        meta: item.status,
      }));
    }

    return [
      ...(settingsData?.settings ?? []).map((item) => ({
        primary: item.settingKey,
        secondary: `${item.description ?? 'No description'} • ${item.isSensitive ? 'Sensitive' : 'Visible'} setting`,
        meta: 'System setting',
      })),
      ...(settingsData?.tenorBands ?? []).map((item) => ({
        primary: item.label,
        secondary: `${item.minDays} to ${item.maxDays} days • code ${item.code}`,
        meta: item.status,
      })),
      ...(settingsData?.sourceChannels ?? []).map((item) => ({
        primary: item.name,
        secondary: `${item.code} • ${item.description ?? 'Source channel'}`,
        meta: item.status,
      })),
    ];
  })();

  const currentLoadState = (() => {
    switch (currentView) {
      case 'summary':
        return summaryOverview;
      case 'trends':
        return trendsOverview;
      case 'portfolio':
        return portfolioOverview;
      case 'investments':
        return investmentsOverview;
      case 'wealth-managers':
        return wealthManagersOverview;
      case 'uploads':
        return uploadsOverview;
      case 'audit':
        return auditOverview;
      case 'integrations':
        return integrationsOverview;
      case 'users':
        return usersOverview;
      case 'settings':
        return settingsOverview;
      default:
        return reportsOverview;
    }
  })();

  const navCounts: Partial<Record<ViewId, string>> = {
    investments: investmentsOverview.data ? formatCount(investmentsOverview.data.count) : undefined,
    uploads: uploadsOverview.data ? formatCount(uploadsOverview.data.count) : undefined,
    reports: reportsOverview.items.length > 0 ? formatCount(reportsOverview.items.length) : undefined,
    integrations: integrationsOverview.data ? formatCount(integrationsOverview.data.count) : undefined,
    users: usersOverview.data ? formatCount(usersOverview.data.count) : undefined,
  };
  const isCustomerView = currentView === 'summary' || currentView === 'trends' || currentView === 'portfolio' || currentView === 'wealth-managers';
  const filteredRows = currentRows.filter((row) => {
    const haystack = `${row.primary} ${row.secondary} ${row.meta}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });
  const filteredCustomers = portfolioItems.filter((customer) => {
    const query = searchQuery.trim().toLowerCase();
    const haystack = `${customer.customerName} ${customer.customerId} ${customer.customerType}`.toLowerCase();
    const matchesSearch = haystack.includes(query);
    const matchesStatus = activeCustomerStatus === 'all' || customer.customerType === activeCustomerStatus;

    return matchesSearch && matchesStatus;
  });
  const filteredWealthManagers = wealthManagerItems.filter((manager) => {
    const query = searchQuery.trim().toLowerCase();
    const haystack = [
      manager.relationshipManager,
      manager.totalAum,
      manager.totalInvestment,
      manager.investmentAccountCount,
      manager.ntbMetrics?.customerCount,
      manager.ntbMetrics?.volume,
      manager.returningCustomerMetrics?.customerCount,
      manager.returningCustomerMetrics?.volume,
      manager.topCustomers.map((customer) => customer.customerName).join(' '),
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
  const filteredInvestmentItems = investmentItems.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const haystack = [
      item.customerName,
      item.customerId,
      item.investmentReference,
      item.relationshipManager,
      item.sourceChannel,
      item.fundType,
      item.tenorCategory,
      item.recordStatus,
      item.importStatus,
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
  const filteredCountLabel = `${filteredRows.length} of ${currentRows.length} visible`;

  function selectView(view: ViewId): void {
    const viewPaths: Record<ViewId, string> = {
      summary: '/summary',
      trends: '/trends',
      portfolio: '/portfolio',
      investments: '/investments',
      'wealth-managers': '/wealth-managers',
      uploads: '/uploads',
      reports: '/reports',
      audit: '/audit',
      integrations: '/integrations',
      users: '/users',
      settings: '/settings',
    };
    navigate(viewPaths[view]);
  }

  function toggleSection(section: string): void {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function toggleSidebar(): void {
    setSidebarCollapsed((current) => !current);
  }

  function toggleTheme(): void {
    setIsDark((current) => {
      const next = !current;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('wt-theme', next ? 'dark' : 'light');
      return next;
    });
  }

  function reloadReportsOverview(): void {
    setReportsRefreshKey((current) => current + 1);
  }

  async function loadMoreInvestments(): Promise<void> {
    const cursor = investmentsOverview.data?.nextCursor;

    if (!cursor || isLoadingMoreInvestments) {
      return;
    }

    setIsLoadingMoreInvestments(true);

    try {
      const data = await fetchViewData<InvestmentsOverview>(`investments?limit=50&cursor=${encodeURIComponent(cursor)}`);
      setInvestmentsOverview((current) => ({
        status: 'ready',
        data: {
          items: [...(current.data?.items ?? []), ...data.items],
          count: data.count,
          nextCursor: data.nextCursor,
          summary: data.summary,
        },
        error: null,
      }));
    } catch (error) {
      setInvestmentsOverview((current) => ({
        status: 'error',
        data: current.data,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setIsLoadingMoreInvestments(false);
    }
  }

  function openDialog(intent: DialogIntent): void {
    setDialogIntent(intent);
  }

  function handleUploadSelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedUploadName('');
      return;
    }

    setSelectedUploadName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotice({
        tone: 'warn',
        message: 'XLSX is not supported yet. Upload a CSV file from the Uploads page.',
      });
      return;
    }

    setNotice({
      tone: 'good',
      message: `${file.name} selected for CSV validation.`,
    });
  }

  async function confirmDialog(): Promise<void> {
    if (!dialogIntent) {
      return;
    }

    setIsDialogBusy(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 600);
    });

    setIsDialogBusy(false);
    setDialogIntent(null);
    setNotice({
      tone: dialogIntent.tone === 'danger' ? 'warn' : 'good',
      message: `${dialogIntent.confirmLabel} has been queued from the current workspace view.`,
    });
  }

  function renderInvestmentRecords(): ReactNode {
    if (investmentsOverview.status === 'loading' && filteredInvestmentItems.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Investment records">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading investment records</h4>
            <p>Fetching the latest database records from the investments API.</p>
          </div>
        </section>
      );
    }

    if (investmentsOverview.status === 'error' && filteredInvestmentItems.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Investment records">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="alert" /></div>
            <h4>Investment records are unavailable</h4>
            <p>{investmentsOverview.error ?? 'The investments API did not return ledger data.'}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="wealth-manager-module panel" aria-label="Investment records">
        <div className="customer-control-panel">
          <div className="customer-search-row">
            <div className="search-input-shell customer-search-shell">
              <Icon name="search" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by customer, reference, manager, or status"
              />
            </div>
            <button className="customer-filter-button" type="button">
              <Icon name="filter" />
              Ledger filters
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => openDialog({ title: 'Export investment records', description: 'Prepare the visible investment ledger rows using the current search.', confirmLabel: 'Export records', tone: 'default' })}>
              Export
            </button>
          </div>
        </div>

        {filteredInvestmentItems.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="search" /></div>
            <h4>No investment records match that search</h4>
            <p>Search by customer, reference, source channel, relationship manager, or status.</p>
            <button className="secondary-button" type="button" onClick={() => setSearchQuery('')}>
              Reset search
            </button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" className="table-rank-col">Rank</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Currency</th>
                    <th scope="col">Type</th>
                    <th scope="col">Term</th>
                    <th scope="col">Tenor</th>
                    <th scope="col">Mobilized</th>
                    <th scope="col">Maturity</th>
                    <th scope="col">Manager</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Record</th>
                    <th scope="col">Import</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestmentItems.map((item, index) => {
                    const statusTone = getToneFromMeta(`${item.recordStatus} ${item.importStatus}`);
                    const rank = index + 1;

                    return (
                      <tr key={item.id}>
                        <td className="table-rank-col">{rank}</td>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{item.customerName}</strong>
                            <small>{item.customerId}</small>
                          </div>
                        </td>
                        <td>
                          <span className="table-value-strong">{formatCurrency(Number(item.investmentAmount))}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.currency}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.fundType}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{formatTenorLabel(item.tenorCategory)}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{formatCount(item.tenorDays)} days</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{formatShortDate(item.mobilisationDate)}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{formatShortDate(item.maturityDate)}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.relationshipManager ?? 'Unassigned'}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.sourceChannel ?? item.dataSource}</span>
                        </td>
                        <td>
                          <span className={`pill pill-${statusTone}`}>{item.recordStatus}</span>
                        </td>
                        <td>
                          <span className={`pill pill-${statusTone}`}>{item.importStatus}</span>
                        </td>
                        <td>
                          <button className="table-action" type="button" onClick={() => openDialog({ title: item.customerName, description: item.investmentReference ?? item.id, confirmLabel: 'View record', tone: statusTone === 'warn' ? 'danger' : 'default' })}>
                            View record
                            <Icon name="launch" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="customer-pagination">
              <span>Loaded {investmentItems.length} of {formatCount(investmentsOverview.data?.count)} investment records</span>
              <button type="button" disabled={!investmentsOverview.data?.nextCursor || isLoadingMoreInvestments} onClick={loadMoreInvestments}>
                {isLoadingMoreInvestments ? 'Loading...' : investmentsOverview.data?.nextCursor ? 'Load more' : 'All records loaded'}
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  function renderWealthManagers(): ReactNode {
    const summary = wealthManagersOverview.data?.summary;
    const summaryAgingItems = getFundsAgingDisplayItems(summary?.fundsAging);
    const summaryAgingTotal = summaryAgingItems.reduce((sum, item) => sum + item.value, 0);

    return (
      <section className="wealth-manager-module panel" aria-label="WEALTH managers">
        <div className="wealth-aging-panel">
          <div className="wealth-aging-stack" aria-label="Funds aging distribution">
            {summaryAgingItems.map((item) => (
              <span
                key={item.key}
                className={`wealth-aging-segment wealth-aging-segment-${item.key}`}
                style={{ width: `${summaryAgingTotal ? Math.max((item.value / summaryAgingTotal) * 100, item.value > 0 ? 4 : 0) : 0}%` }}
              />
            ))}
          </div>
        </div>

        <div className="customer-control-panel">
          <div className="customer-search-row">
            <div className="search-input-shell customer-search-shell">
              <Icon name="search" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by WEALTH manager, AUM, or top customer"
              />
            </div>
            <button className="customer-filter-button" type="button">
              <Icon name="filter" />
              AUM filters
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => openDialog({ title: 'Export WEALTH managers', description: 'Prepare the visible WEALTH manager AUM and funds-aging view for export.', confirmLabel: 'Export managers', tone: 'default' })}>
              Export
            </button>
          </div>
        </div>

        {wealthManagersOverview.status === 'loading' && filteredWealthManagers.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading WEALTH manager performance</h4>
            <p>Fetching manager AUM, NTB, returning customer, and funds-aging aggregates from uploaded investments.</p>
          </div>
        ) : filteredWealthManagers.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="search" /></div>
            <h4>No manager records match that search</h4>
            <p>Search by manager name, top customer, or clear the current query to restore the full manager list.</p>
            <button className="secondary-button" type="button" onClick={() => setSearchQuery('')}>
              Reset search
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="table-rank-col">Rank</th>
                  <th scope="col">Manager</th>
                  <th scope="col">AUM</th>
                  <th scope="col">Accounts</th>
                  <th scope="col">NTB</th>
                  <th scope="col">NTB Customers</th>
                  <th scope="col">Returning</th>
                  <th scope="col">Returning Customers</th>
                  <th scope="col">Aging Mix</th>
                  <th scope="col">Aging Bucket</th>
                  <th scope="col">Aging Value</th>
                  <th scope="col">Top Customer</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWealthManagers.map((manager, index) => {
                  const agingItems = getFundsAgingDisplayItems(manager.fundsAging);
                  const agingTotal = agingItems.reduce((sum, item) => sum + item.value, 0);
                  const dominantBucket = getDominantFundsAgingBucket(manager.fundsAging);
                  const topCustomer = manager.topCustomers[0];

                  return (
                    <tr key={manager.relationshipManager}>
                      <td className="table-rank-col">{index + 1}</td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{manager.relationshipManager}</strong>
                          <small>WEALTH manager</small>
                        </div>
                      </td>
                      <td><span className="table-value-strong">{formatCurrency(manager.totalAum)}</span></td>
                      <td><span className="table-secondary-copy">{formatCount(manager.investmentAccountCount)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.ntbMetrics.volume)}</span></td>
                      <td><span className="table-secondary-copy">{formatCount(manager.ntbMetrics.customerCount)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.returningCustomerMetrics.volume)}</span></td>
                      <td><span className="table-secondary-copy">{formatCount(manager.returningCustomerMetrics.customerCount)}</span></td>
                      <td>
                        <div className="wealth-aging-stack compact" aria-label={`${manager.relationshipManager} funds aging distribution`}>
                          {agingItems.map((item) => (
                            <span
                              key={item.key}
                              className={`wealth-aging-segment wealth-aging-segment-${item.key}`}
                              title={`${item.label}: ${formatCurrency(item.value)}`}
                              style={{ width: `${agingTotal ? Math.max((item.value / agingTotal) * 100, item.value > 0 ? 4 : 0) : 0}%` }}
                            />
                          ))}
                        </div>
                      </td>
                      <td><span className="table-secondary-copy">{dominantBucket.label}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(dominantBucket.value)}</span></td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{topCustomer?.customerName ?? 'No customer'}</strong>
                          <small>{topCustomer ? formatCurrency(topCustomer.totalInvestment) : 'No record'}</small>
                        </div>
                      </td>
                      <td>
                        <button className="table-action" type="button" onClick={() => openDialog({ title: manager.relationshipManager, description: 'Open detailed WEALTH manager AUM and customer mix.', confirmLabel: 'View manager', tone: 'default' })}>
                          View
                          <Icon name="launch" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="customer-pagination">
          <span>Showing {filteredWealthManagers.length} of {wealthManagerItems.length} WEALTH managers</span>
          <div>
            <button type="button" disabled>Prev</button>
            <button className="page-chip-active" type="button">1</button>
            <button type="button">Next</button>
          </div>
        </div>
      </section>
    );
  }

  function renderCustomerRecords(): ReactNode {
    if (portfolioOverview.status === 'loading' && filteredCustomers.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Customer portfolio">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading customer portfolio</h4>
            <p>Fetching ranked customer investment data from the analytics dashboard API.</p>
          </div>
        </section>
      );
    }

    if (portfolioOverview.status === 'error' && filteredCustomers.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Customer portfolio">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="alert" /></div>
            <h4>Customer portfolio is unavailable</h4>
            <p>{portfolioOverview.error ?? 'The analytics API did not return customer portfolio data.'}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="wealth-manager-module panel" aria-label="Customer records">
        <div className="customer-control-panel">
          <div className="customer-tab-bar" role="tablist" aria-label="Customer status filters">
            {customerTabs.map((tab) => (
              <button
                key={tab.id}
                className={tab.id === activeCustomerStatus ? 'customer-tab customer-tab-active' : 'customer-tab'}
                type="button"
                role="tab"
                aria-selected={tab.id === activeCustomerStatus}
                onClick={() => setActiveCustomerStatus(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{getCustomerTabCount(portfolioItems, tab.id)}</small>
              </button>
            ))}
          </div>

          <div className="customer-search-row">
            <div className="search-input-shell customer-search-shell">
              <Icon name="search" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by customer name or customer ID"
              />
            </div>
            <button className="customer-filter-button" type="button">
              <Icon name="filter" />
              Portfolio filters
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => openDialog({ title: 'Export customer portfolio', description: 'Prepare the visible ranked customer portfolio using the active customer filter and search query.', confirmLabel: 'Export portfolio', tone: 'default' })}>
              Export
            </button>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="search" /></div>
            <h4>No customers match these filters</h4>
            <p>Reset the customer-type tab or search query to restore the ranked customer portfolio.</p>
            <button className="secondary-button" type="button" onClick={() => { setSearchQuery(''); setActiveCustomerStatus('all'); }}>
              Reset filters
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="table-rank-col">Rank</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Total</th>
                  <th scope="col">Investments</th>
                  <th scope="col">Share</th>
                  <th scope="col">Type</th>
                  <th scope="col">Inflow</th>
                  <th scope="col">Rollover</th>
                  <th scope="col">Last Amount</th>
                  <th scope="col">Last Date</th>
                  <th scope="col">Top Term</th>
                  <th scope="col">Term Value</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const leadTenor = getLeadingTenor(customer.tenorExposure);

                  return (
                    <tr key={customer.customerId}>
                      <td className="table-rank-col">{index + 1}</td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{customer.customerName}</strong>
                          <small>{customer.customerId}</small>
                        </div>
                      </td>
                      <td><span className="table-value-strong">{formatCurrency(customer.totalInvestment)}</span></td>
                      <td><span className="table-secondary-copy">{formatCount(customer.investmentCount)}</span></td>
                      <td><span className="table-secondary-copy">{formatPercent(customer.contributionPercentage)}</span></td>
                      <td><span className="pill pill-neutral">{formatCustomerType(customer.customerType)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.inflowValue)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.rolloverValue)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.lastInvestmentAmount)}</span></td>
                      <td><span className="table-secondary-copy">{formatShortDate(customer.lastInvestmentDate)}</span></td>
                      <td><span className="table-secondary-copy">{leadTenor.label}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(leadTenor.value)}</span></td>
                      <td>
                        <button className="table-action" type="button" onClick={() => openDialog({ title: customer.customerName, description: `Open investment history for ${customer.customerId}.`, confirmLabel: 'View history', tone: 'default' })}>
                          History
                          <Icon name="launch" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="customer-pagination">
          <span>Showing {filteredCustomers.length} of {portfolioItems.length} ranked customers</span>
          <div>
            <button type="button" disabled>Prev</button>
            <button className="page-chip-active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">Next</button>
          </div>
        </div>
      </section>
    );
  }

  function renderReportsOverview(): ReactNode {
    const reportCount = reportItemsInRange.length;
    const completedReports = reportItemsInRange.filter((item) => item.status === 'completed');
    const queuedReports = reportItemsInRange.filter((item) => item.status === 'pending' || item.status === 'processing');
    const failedReports = reportItemsInRange.filter((item) => item.status === 'failed');
    const averageDuration = completedReports
      .map((item) => formatDurationMinutes(item.createdAt, item.completedAt))
      .filter((value): value is number => value !== null);
    const averageDurationValue = averageDuration.length > 0
      ? `${Math.round(averageDuration.reduce((sum, value) => sum + value, 0) / averageDuration.length)}m`
      : '--';
    const successRate = reportCount > 0 ? `${Math.round((completedReports.length / reportCount) * 100)}%` : '--';
    const latestCompleted = completedReports[0]?.completedAt ?? completedReports[0]?.createdAt ?? null;
    const reportMetricCards: Metric[] = [
      {
        label: 'Delivered',
        value: String(completedReports.length),
        helper: 'Completed exports in range',
        tone: 'good',
        delta: successRate === '--' ? 'No completed runs' : `${successRate} success rate`,
        icon: 'file',
      },
      {
        label: 'Queue Depth',
        value: String(queuedReports.length),
        helper: 'Pending and processing jobs',
        tone: queuedReports.length > 0 ? 'warn' : 'neutral',
        delta: queuedReports.length > 0 ? `${queuedReports.length} active jobs` : 'Queue clear',
        icon: 'clock',
      },
      {
        label: 'Avg. Time',
        value: averageDurationValue,
        helper: 'Average completion duration',
        tone: 'neutral',
        delta: latestCompleted ? `Latest ${formatReportTime(latestCompleted)}` : 'No completions yet',
        icon: 'spark',
      },
      {
        label: 'Failures',
        value: String(failedReports.length),
        helper: 'Failed export attempts',
        tone: failedReports.length > 0 ? 'warn' : 'good',
        delta: failedReports.length > 0 ? 'Needs review' : 'No failures',
        icon: 'alert',
      },
    ];
    const trendData = buildReportTrendData(reportItemsInRange, activeRange);
    const formatMix = [
      { label: 'CSV', value: reportItemsInRange.filter((item) => item.outputFormat === 'csv').length, color: chartToneColors.good },
      { label: 'XLSX', value: reportItemsInRange.filter((item) => item.outputFormat === 'xlsx').length, color: chartToneColors.brand },
      { label: 'PDF', value: reportItemsInRange.filter((item) => item.outputFormat === 'pdf').length, color: chartToneColors.warn },
    ].filter((item) => item.value > 0);
    const typeDemand = Object.entries(reportTypeLabels).map(([key, label]) => ({
      label,
      value: reportItemsInRange.filter((item) => item.reportType === key).length,
    })).filter((item) => item.value > 0);
    const statusMix = [
      { label: 'Completed', value: completedReports.length, color: chartToneColors.good },
      { label: 'Queued', value: reportItemsInRange.filter((item) => item.status === 'pending').length, color: chartToneColors.warn },
      { label: 'Running', value: reportItemsInRange.filter((item) => item.status === 'processing').length, color: chartToneColors.brand },
      { label: 'Failed', value: failedReports.length, color: '#b74438' },
    ].filter((item) => item.value > 0);

    return (
      <section className="reports-dashboard" aria-label="Reports overview dashboard">
        <section className="reports-toolbar panel">
          <div className="reports-toolbar-copy">
            <p className="eyebrow">Reporting overview</p>
            <h2>High-level report operations.</h2>
            <p>Monitor queue health, export demand, delivery mix, and recent runs from one reporting surface.</p>
          </div>

          <div className="reports-toolbar-actions">
            <div className="reports-range-group" role="tablist" aria-label="Report window">
              {rangeOptions.map((option) => (
                <button key={option} className={option === activeRange ? 'range-option range-option-active' : 'range-option'} type="button" onClick={() => setActiveRange(option)}>
                  {option}
                </button>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={() => openDialog({ title: 'Open report queue', description: 'Open the report processing queue and inspect queued or delayed exports.', confirmLabel: 'Open queue', tone: 'default' })}>
              {currentDefinition.secondaryActionLabel}
            </button>
            <button className="secondary-button" type="button" onClick={reloadReportsOverview}>
              Refresh data
            </button>
            <button className="primary-button" type="button" onClick={() => openDialog({ title: 'Create report export', description: 'Create a new report export from the reporting overview dashboard.', confirmLabel: 'Create report', tone: 'default' })}>
              {currentDefinition.actionLabel}
            </button>
          </div>
        </section>

        {reportsOverview.status === 'error' && reportsOverview.items.length === 0 ? (
          <div className="feedback-banner feedback-warn">Reports data is unavailable: {reportsOverview.error}</div>
        ) : null}

        <section className="reports-kpi-grid" aria-label="Report KPIs">
          {reportMetricCards.map((metric) => (
            <article key={metric.label} className={`metric-card metric-card-${metric.tone} reports-kpi-card`}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span className="reports-kpi-helper">{metric.helper}</span>
              <span className={`metric-delta metric-delta-${metric.tone}`}>{metric.delta}</span>
            </article>
          ))}
        </section>

        <section className="reports-overview-grid">
          <article className="panel reports-chart-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Volume</p>
                <h3>Exports over time</h3>
              </div>
              <span className="table-count">{activeRange}</span>
            </div>
            <div className="reports-chart-canvas" aria-label="Exports over time chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="reportsTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartToneColors.brand} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={chartToneColors.brand} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(20, 41, 37, 0.08)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} />
                  <Tooltip cursor={{ stroke: chartToneColors.brand, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke={chartToneColors.brand} fill="url(#reportsTrendFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel reports-chart-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Mix</p>
                <h3>Format distribution</h3>
              </div>
              <span className="table-count">Current window</span>
            </div>
            <div className="reports-chart-canvas reports-chart-canvas-pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formatMix} dataKey="value" nameKey="label" innerRadius={62} outerRadius={94} paddingAngle={3}>
                    {formatMix.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="reports-pie-legend">
              {formatMix.map((item) => (
                <article key={item.label} className="reports-pie-legend-item">
                  <span className="reports-pie-dot" style={{ backgroundColor: item.color }} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.value} exports</small>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="reports-overview-grid reports-overview-grid-secondary">
          <article className="panel reports-chart-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Demand</p>
                <h3>Top report types</h3>
              </div>
            </div>
            <div className="reports-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeDemand} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(20, 41, 37, 0.08)" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} width={92} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} fill={chartToneColors.brand} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel reports-chart-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Status</p>
                <h3>Queue breakdown</h3>
              </div>
              <span className="table-count">{reportCount} total</span>
            </div>
            <div className="reports-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusMix}>
                  <CartesianGrid vertical={false} stroke="rgba(20, 41, 37, 0.08)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {statusMix.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="reports-status-grid">
              {statusMix.map((item) => (
                <article key={item.label} className="reports-status-card">
                  <span className="reports-status-dot" style={{ backgroundColor: item.color }} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.value} jobs</small>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="panel reports-table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent runs</p>
              <h3>Latest report activity</h3>
            </div>
            <div className="reports-table-actions">
              <div className="search-input-shell reports-table-search">
                <Icon name="search" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search report runs"
                />
              </div>
              <button className="secondary-button" type="button" onClick={() => openDialog({ title: 'Download latest report', description: 'Prepare the latest completed report export for download.', confirmLabel: 'Download latest', tone: 'default' })}>
                Download latest
              </button>
            </div>
          </div>

          {reportsOverview.status === 'loading' && filteredRows.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="empty-state-icon"><Icon name="refresh" /></div>
              <h4>Loading reports</h4>
              <p>Fetching live export activity from the reports API.</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="empty-state-icon"><Icon name="search" /></div>
              <h4>{emptyStateCopyByView[currentView].title}</h4>
              <p>{emptyStateCopyByView[currentView].description}</p>
              <button className="secondary-button" type="button" onClick={() => setSearchQuery('')}>
                Reset search
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col">Summary</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const tone = getToneFromMeta(row.meta);

                    return (
                      <tr key={row.primary}>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{row.primary}</strong>
                            <small>{row.meta}</small>
                          </div>
                        </td>
                        <td>
                          <div className="table-metadata-pieces">
                            {row.secondary.split(' • ').map((part) => (
                              <span key={part} className="table-secondary-copy">{part}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`pill pill-${tone}`}>{row.meta}</span>
                        </td>
                        <td>
                          <button className="table-action" type="button" onClick={() => openDialog({ title: row.primary, description: row.secondary, confirmLabel: 'Open report', tone: tone === 'warn' ? 'danger' : 'default' })}>
                            Open report
                            <Icon name="launch" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    );
  }

  function renderTrends(): ReactNode {
    if (trendsOverview.status === 'loading' && !trendsData) {
      return (
        <section className="panel table-panel" aria-label="Trends loading">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading trend data</h4>
            <p>Fetching historical investment series from the analytics engine.</p>
          </div>
        </section>
      );
    }

    if (trendsOverview.status === 'error' && !trendsData) {
      return (
        <section className="panel table-panel" aria-label="Trends error">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="alert" /></div>
            <h4>Trend data unavailable</h4>
            <p>{trendsOverview.error ?? 'Unable to load trend data from the analytics API.'}</p>
          </div>
        </section>
      );
    }

    type TrendPeriod = 'daily' | 'weekly' | 'monthly';

    function formatTrendPeriod(period: string): string {
      if (period.includes('-W')) return period.split('-')[1];
      if (period.length === 7) {
        const d = new Date(`${period}-01T00:00:00`);
        return d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      }
      if (period.length === 10) {
        const d = new Date(`${period}T00:00:00`);
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      }
      return period;
    }

    function periodLabel(p: TrendPeriod): string {
      return p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly';
    }

    const gridStroke = 'rgba(20, 41, 37, 0.06)';
    const CHART_H = 210;

    function chartGrad(id: string, color: string): ReactNode {
      return (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.22} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
      );
    }

    function countAxes(): ReactNode {
      return (
        <>
          <CartesianGrid vertical={false} stroke={gridStroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={44} />
          <Tooltip />
        </>
      );
    }

    function volumeAxes(): ReactNode {
      return (
        <>
          <CartesianGrid vertical={false} stroke={gridStroke} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={60} tickFormatter={(v: number) => formatCurrency(v)} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
        </>
      );
    }

    function PeriodToggle({ value, onChange }: { value: TrendPeriod; onChange: (p: TrendPeriod) => void }): ReactNode {
      return (
        <div className="range-toggle trends-group-period" role="tablist" aria-label="Chart resolution">
          {(['daily', 'weekly', 'monthly'] as TrendPeriod[]).map((p) => (
            <button key={p} type="button" className={p === value ? 'range-option range-option-active' : 'range-option'} onClick={() => onChange(p)}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
      );
    }

    // — AUM group —
    const aumSeries = trendsData?.[aumPeriod] ?? [];
    const aumChartData = aumSeries.map((p) => ({
      label: formatTrendPeriod(p.period),
      count: p.investmentCount,
      volume: p.totalInvestment,
    }));
    const totalAUMVolume = aumSeries.reduce((s, p) => s + p.totalInvestment, 0);
    const totalAUMCount = aumSeries.reduce((s, p) => s + p.investmentCount, 0);

    // — NTB group —
    const ntbBreakdown = trendsData?.trendBreakdown[ntbPeriod] ?? [];
    const ntbChartData = ntbBreakdown.map((p) => ({
      label: formatTrendPeriod(p.period),
      volume: p.newCustomerInvestment,
      count: p.newCustomerCount,
    }));
    const totalNTBVolume = ntbBreakdown.reduce((s, p) => s + p.newCustomerInvestment, 0);
    const peakNTBCount = ntbBreakdown.length > 0 ? Math.max(...ntbBreakdown.map((p) => p.newCustomerCount)) : 0;

    // — Returning group —
    const retBreakdown = trendsData?.trendBreakdown[returningPeriod] ?? [];
    const retChartData = retBreakdown.map((p) => ({
      label: formatTrendPeriod(p.period),
      volume: p.returningCustomerInvestment,
      count: p.returningCustomerCount,
    }));
    const totalReturnVolume = retBreakdown.reduce((s, p) => s + p.returningCustomerInvestment, 0);
    const peakReturnCount = retBreakdown.length > 0 ? Math.max(...retBreakdown.map((p) => p.returningCustomerCount)) : 0;

    const isFiltered = !!(trendsFrom || trendsTo);

    return (
      <div className="trends-charts-page">
        <section className="panel trends-toolbar">
          <div className="trends-toolbar-left">
            <span className="trends-period-label">Date range</span>
            <div className="date-range-group">
              <input
                type="date"
                className="date-range-input"
                aria-label="From date"
                value={trendsFrom}
                max={trendsTo || undefined}
                onChange={(e) => setTrendsFrom(e.target.value)}
              />
              <span className="trends-date-sep">→</span>
              <input
                type="date"
                className="date-range-input"
                aria-label="To date"
                value={trendsTo}
                min={trendsFrom || undefined}
                onChange={(e) => setTrendsTo(e.target.value)}
              />
              {isFiltered ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { setTrendsFrom(''); setTrendsTo(''); }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div className="trends-toolbar-right">
            {trendsOverview.status === 'loading' ? (
              <span className="pill pill-neutral">Refreshing…</span>
            ) : isFiltered ? (
              <span className="pill pill-good">Filtered view</span>
            ) : (
              <span className="pill pill-neutral">All-time</span>
            )}
          </div>
        </section>

        <div className="trends-group">
          <div className="panel trends-group-header">
            <div>
              <p className="eyebrow">AUM</p>
              <h3>Assets under management</h3>
            </div>
            <PeriodToggle value={aumPeriod} onChange={setAumPeriod} />
          </div>
          <div className="trends-chart-grid">
            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Volume</p>
                  <h3>Investment volume</h3>
                </div>
                <strong className="trends-kpi">{formatCurrency(totalAUMVolume)}</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={aumChartData}>
                    {chartGrad('aumVolumeFill', chartToneColors.brand)}
                    {volumeAxes()}
                    <Area type="monotone" dataKey="volume" name="Volume" stroke={chartToneColors.brand} fill="url(#aumVolumeFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Count</p>
                  <h3>Investment count</h3>
                </div>
                <strong className="trends-kpi">{formatCount(totalAUMCount)}</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={aumChartData}>
                    {chartGrad('aumCountFill', chartToneColors.brand)}
                    {countAxes()}
                    <Area type="monotone" dataKey="count" name="Count" stroke={chartToneColors.brand} fill="url(#aumCountFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </div>

        <div className="trends-group">
          <div className="panel trends-group-header">
            <div>
              <p className="eyebrow">NTB</p>
              <h3>New-to-Bank customers</h3>
            </div>
            <PeriodToggle value={ntbPeriod} onChange={setNtbPeriod} />
          </div>
          <div className="trends-chart-grid">
            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Volume</p>
                  <h3>New customer volume</h3>
                </div>
                <strong className="trends-kpi">{formatCurrency(totalNTBVolume)}</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={ntbChartData}>
                    {chartGrad('ntbVolumeFill', chartToneColors.good)}
                    {volumeAxes()}
                    <Area type="monotone" dataKey="volume" name="NTB volume" stroke={chartToneColors.good} fill="url(#ntbVolumeFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Count</p>
                  <h3>New customer count</h3>
                </div>
                <strong className="trends-kpi">{formatCount(peakNTBCount)} peak</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={ntbChartData}>
                    {chartGrad('ntbCountFill', chartToneColors.good)}
                    {countAxes()}
                    <Area type="monotone" dataKey="count" name="NTB count" stroke={chartToneColors.good} fill="url(#ntbCountFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </div>

        <div className="trends-group">
          <div className="panel trends-group-header">
            <div>
              <p className="eyebrow">Returning</p>
              <h3>Returning customers</h3>
            </div>
            <PeriodToggle value={returningPeriod} onChange={setReturningPeriod} />
          </div>
          <div className="trends-chart-grid">
            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Volume</p>
                  <h3>Returning customer volume</h3>
                </div>
                <strong className="trends-kpi">{formatCurrency(totalReturnVolume)}</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={retChartData}>
                    {chartGrad('returnVolumeFill', chartToneColors.warn)}
                    {volumeAxes()}
                    <Area type="monotone" dataKey="volume" name="Returning volume" stroke={chartToneColors.warn} fill="url(#returnVolumeFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Count</p>
                  <h3>Returning customer count</h3>
                </div>
                <strong className="trends-kpi">{formatCount(peakReturnCount)} peak</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <AreaChart data={retChartData}>
                    {chartGrad('returnCountFill', chartToneColors.warn)}
                    {countAxes()}
                    <Area type="monotone" dataKey="count" name="Returning count" stroke={chartToneColors.warn} fill="url(#returnCountFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </div>
      </div>
    );
  }

  function renderWorkbench(): ReactNode {
    if (currentView === 'settings') {
      const activeTenorBands = settingsData?.tenorBands.filter((item) => item.status === 'active') ?? [];
      const activeSourceChannels = settingsData?.sourceChannels.filter((item) => item.status === 'active') ?? [];

      return (
        <section className="detail-panel panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Configuration</p>
              <h3>{panelCopyByView[currentView].title}</h3>
            </div>
            <span className="pill pill-neutral">Admin controls</span>
          </div>

          <div className="inline-note-grid">
            <article className="inline-note-card">
              <strong>System settings</strong>
              <p>{formatCount(settingsData?.settings.length)} persisted keys, with {formatCount(settingsData?.settings.filter((item) => item.isSensitive).length)} marked as sensitive and restricted to admins.</p>
            </article>
            <article className="inline-note-card">
              <strong>Tenor bands</strong>
              <p>{activeTenorBands.length > 0 ? activeTenorBands.map((item) => `${item.label} (${item.minDays}-${item.maxDays}d)`).slice(0, 3).join(' • ') : 'No active tenor bands returned.'}</p>
            </article>
            <article className="inline-note-card">
              <strong>Source channels</strong>
              <p>{activeSourceChannels.length > 0 ? activeSourceChannels.map((item) => item.name).slice(0, 4).join(' • ') : 'No active source channels returned.'}</p>
            </article>
          </div>

          <div className="panel-footer">
            <div className="panel-footer-actions">
              <button className="secondary-button" type="button" onClick={() => openDialog({ title: 'Review configuration audit log', description: 'Open the change log to inspect prior configuration updates and approval history before saving.', confirmLabel: 'Open change log', tone: 'default' })}>
                {currentDefinition.secondaryActionLabel}
              </button>
              <button className="primary-button" type="button" onClick={() => openDialog({ title: 'Save configuration changes', description: 'This will queue the updated reporting defaults and operational controls for review from the settings page.', confirmLabel: 'Save settings', tone: 'default' })}>
                {currentDefinition.actionLabel}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (currentView === 'users') {
      const activeUsers = userItems.filter((item) => item.status === 'active');
      const suspendedUsers = userItems.filter((item) => item.status === 'suspended');

      return (
        <section className="detail-panel panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Users</p>
              <h3>{panelCopyByView[currentView].title}</h3>
            </div>
            <span className="pill pill-good">Protected workflow</span>
          </div>

          <div className="inline-note-grid">
            <article className="inline-note-card">
              <strong>Active users</strong>
              <p>{formatCount(activeUsers.length)} active accounts are available for dashboard, upload, and reporting workflows.</p>
            </article>
            <article className="inline-note-card">
              <strong>Suspended users</strong>
              <p>{formatCount(suspendedUsers.length)} suspended accounts require governance review before they can be reactivated.</p>
            </article>
            <article className="inline-note-card">
              <strong>Recent access activity</strong>
              <p>{userItems.find((item) => item.lastLoginAt) ? `${userItems.find((item) => item.lastLoginAt)?.name} logged in ${formatDateTime(userItems.find((item) => item.lastLoginAt)?.lastLoginAt)}.` : 'No recent login timestamps were returned by the API.'}</p>
            </article>
          </div>

          <div className="panel-footer">
            <div className="panel-footer-actions">
              <button className="secondary-button" type="button" onClick={() => openDialog({ title: 'Review role permissions', description: 'Open the permission map to validate the current access model before inviting another user.', confirmLabel: 'Open permissions', tone: 'default' })}>
                {currentDefinition.secondaryActionLabel}
              </button>
              <button className="primary-button" type="button" onClick={() => openDialog({ title: 'Invite platform user', description: 'This queues a new user invitation with the selected role and keeps approval context visible to administrators.', confirmLabel: 'Invite user', tone: 'default' })}>
                {currentDefinition.actionLabel}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (currentView === 'uploads') {
      return (
        <section className="detail-panel panel upload-workbench-panel">
          <div className="panel-header">
            <div>
              <h3>CSV upload</h3>
            </div>
            <span className="pill pill-warn">CSV</span>
          </div>

          <div className="form-grid">
            <label className="field-card field-card-wide upload-field">
              <span className="field-label">File</span>
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleUploadSelection}
              />
              {selectedUploadName ? <small className="upload-selection">Selected: {selectedUploadName}</small> : null}
            </label>
          </div>

          <div className="panel-footer">
            <div className="panel-footer-actions">
              <button className="secondary-button" type="button" onClick={() => openDialog({ title: currentDefinition.secondaryActionLabel, description: 'Open the current upload errors and validation exceptions.', confirmLabel: currentDefinition.secondaryActionLabel, tone: 'default' })}>
                {currentDefinition.secondaryActionLabel}
              </button>
              <button className="primary-button" type="button" onClick={() => openDialog({ title: currentDefinition.actionLabel, description: selectedUploadName ? `${selectedUploadName} is staged for upload review.` : 'Choose a CSV file first to start the upload flow.', confirmLabel: currentDefinition.actionLabel, tone: 'default' })}>
                {currentDefinition.actionLabel}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (currentView === 'integrations') {
      const steps = ['Select source', 'Run sync', 'Inspect errors', 'Confirm retry'];
      const failedSources = integrationItems.filter((item) => item.status === 'failed');

      return (
        <section className="detail-panel panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Operations</p>
              <h3>{panelCopyByView[currentView].title}</h3>
            </div>
            <span className="pill pill-warn">Action workflow</span>
          </div>

          <div className="step-grid">
            {steps.map((step, index) => (
              <article key={step} className="step-card">
                <span className="step-index">0{index + 1}</span>
                <strong>{step}</strong>
              </article>
            ))}
          </div>

          <div className="inline-note-grid">
            <article className="inline-note-card">
              <strong>Sync health</strong>
              <p>{integrationItems.length > 0 ? `${formatCount(integrationItems.filter((item) => item.status === 'active').length)} active sources, ${formatCount(failedSources.length)} failed sources, ${formatCount(integrationItems.filter((item) => item.lastSuccessfulSyncAt).length)} with successful sync history.` : 'No integration sources returned from the API.'}</p>
            </article>
            <article className="inline-note-card">
              <strong>Recovery focus</strong>
              <p>{failedSources.length > 0 ? failedSources.map((item) => item.name).slice(0, 3).join(' • ') : 'No failed sources are currently flagged.'}</p>
            </article>
          </div>

          <div className="panel-footer">
            <div className="panel-footer-actions">
              <button className="secondary-button" type="button" onClick={() => openDialog({ title: currentDefinition.secondaryActionLabel, description: `Open the supporting ${currentDefinition.badge.toLowerCase()} workflow so operators can inspect the current state before proceeding.`, confirmLabel: currentDefinition.secondaryActionLabel, tone: 'default' })}>
                {currentDefinition.secondaryActionLabel}
              </button>
              <button className="primary-button" type="button" onClick={() => openDialog({ title: currentDefinition.actionLabel, description: `Confirm this ${currentDefinition.badge.toLowerCase()} command before it is sent from the current page context.`, confirmLabel: currentDefinition.actionLabel, tone: 'danger' })}>
                {currentDefinition.actionLabel}
              </button>
            </div>
          </div>
        </section>
      );
    }

    return null;
  }

  return (
    <div className={sidebarCollapsed ? 'app-shell app-shell-sidebar-collapsed' : 'app-shell'}>
      <div className={mobileNavOpen ? 'mobile-scrim mobile-scrim-open' : 'mobile-scrim'} onClick={() => setMobileNavOpen(false)} aria-hidden={!mobileNavOpen} />

      <aside className={mobileNavOpen ? `sidebar ${sidebarCollapsed ? 'sidebar-collapsed ' : ''}sidebar-open` : sidebarCollapsed ? 'sidebar sidebar-collapsed' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="brand-mark">W</div>
          <div className="brand-copy">
            <strong>WealthTrack</strong>
            <span>Operations Console</span>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={sidebarCollapsed}
          >
            <span className={sidebarCollapsed ? 'sidebar-toggle-icon sidebar-toggle-icon-collapsed' : 'sidebar-toggle-icon'}>
              <Icon name="chevron" />
            </span>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigationSections.map((section) => {
            const isCollapsed = collapsedSections[section.title];

            return (
              <section key={section.title} className="nav-group">
                <button
                  className="nav-section-toggle"
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="nav-section">{section.title}</span>
                  <span className={isCollapsed ? 'nav-section-icon nav-section-icon-collapsed' : 'nav-section-icon'}>
                    <Icon name="chevron" />
                  </span>
                </button>

                {!isCollapsed ? section.items.map((item) => (
                  <button key={item.label} className={item.view === currentView ? 'nav-item nav-item-active' : 'nav-item'} type="button" onClick={() => selectView(item.view)} title={item.label}>
                    <span className="nav-icon"><Icon name={item.icon} /></span>
                    <span className="nav-copy">
                      <span>{item.label}</span>
                    </span>
                    {navCounts[item.view] ? <span className="nav-count">{navCounts[item.view]}</span> : null}
                  </button>
                )) : null}
              </section>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className={`status-chip status-chip-${health.status}`}>{health.label}</span>
          <p>{health.details}</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-trigger" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Icon name="grid" />
            </button>
            <div>
              <p className="eyebrow topbar-eyebrow">Platform Shell</p>
              <div className="topbar-heading-row">
                <strong>WealthTrack dashboard</strong>
                <span className="status-chip status-chip-neutral">{currentDefinition.statusLabel}</span>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="status-chip status-chip-neutral">Portfolio Admin</span>

            <button className="icon-button" type="button" aria-label="Search notifications">
              <Icon name="search" />
            </button>
            <button className="icon-button" type="button" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              <Icon name={isDark ? 'sun' : 'moon'} />
            </button>
            <button className="icon-button" type="button" aria-label="Open notifications">
              <Icon name="bell" />
            </button>

            <button
              className="user-chip"
              type="button"
              onClick={() => openDialog({
                title: 'End current session',
                description: 'Sign out from the dashboard shell. This is treated as a protected action because it interrupts the current admin workflow.',
                confirmLabel: 'Log out',
                tone: 'danger',
              })}
            >
              <span className="user-avatar">PA</span>
              <span className="user-copy">
                <strong>Operations Lead</strong>
                <small>Signed in</small>
              </span>
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <div className="content-shell">
          <header className="page-title-row" aria-label={`${currentDefinition.heroTitle} page header`}>
            <div className="page-title-info">
              <h1 className="page-title">{currentDefinition.heroTitle}</h1>
            </div>
          </header>

          {notice ? <div className={`feedback-banner feedback-${notice.tone}`}>{notice.message}</div> : null}
          {currentView !== 'reports' && currentLoadState.status === 'error' ? <div className="feedback-banner feedback-warn">Live data is unavailable for this tab: {currentLoadState.error}</div> : null}

          {currentView === 'reports' ? renderReportsOverview() : (
            <>
              {currentView === 'portfolio' || currentView === 'wealth-managers' || currentView === 'investments' || currentView === 'trends' ? null : (
                <section className="toolbar panel">
                  <div className="toolbar-search-block">
                    <label className="toolbar-label" htmlFor="dashboard-search">Search</label>
                    <div className="search-input-shell">
                      <Icon name="search" />
                      <input
                        id="dashboard-search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={getSearchPlaceholder(currentView)}
                      />
                    </div>
                  </div>

                  {currentView !== 'integrations' && currentView !== 'users' ? (
                  <div className="toolbar-filter-block">
                    <span className="toolbar-label">Window</span>
                    <div className="range-toggle" role="tablist" aria-label="Select reporting window">
                      {rangeOptions.map((option) => (
                        <button key={option} className={option === activeRange ? 'range-option range-option-active' : 'range-option'} type="button" onClick={() => setActiveRange(option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  ) : null}

                  <div className="toolbar-summary-block">
                    <span className="toolbar-label">Visible rows</span>
                    <strong>{filteredCountLabel}</strong>
                  </div>
                </section>
              )}

              <section className="metric-grid" aria-label="Key metrics">
                {currentMetrics.map((metric) => (
                  <article key={metric.label} className={`metric-card metric-card-${metric.tone}`}>
                    <p>{metric.label}</p>
                    <strong>{metric.value}</strong>
                    <span className={`metric-delta metric-delta-${metric.tone}`}>{metric.delta}</span>
                  </article>
                ))}
              </section>

              <section className="dashboard-grid">
                <div className="main-column">
                  {currentView === 'portfolio' ? (
                    renderCustomerRecords()
                  ) : currentView === 'investments' ? (
                    renderInvestmentRecords()
                  ) : currentView === 'wealth-managers' ? (
                    renderWealthManagers()
                  ) : currentView === 'trends' ? (
                    renderTrends()
                  ) : (
                    <>
                      <section className="panel table-panel">
                        <div className="panel-header">
                          <div>
                            {currentView === 'uploads' ? null : <p className="eyebrow">Primary read model</p>}
                            <h3>{currentView === 'uploads' ? 'Upload history' : currentDefinition.title}</h3>
                          </div>
                          <div className="panel-header-actions">
                            <span className="table-count">{filteredRows.length} rows</span>
                            <button className="secondary-button" type="button" onClick={() => openDialog({ title: 'Export current table', description: `Prepare the visible ${currentDefinition.title.toLowerCase()} rows for export using the current page filters.`, confirmLabel: 'Export visible rows', tone: 'default' })}>
                              Export
                            </button>
                          </div>
                        </div>

                        {currentLoadState.status === 'loading' && filteredRows.length === 0 ? (
                          <div className="empty-state" role="status" aria-live="polite">
                            <div className="empty-state-icon"><Icon name="refresh" /></div>
                            <h4>Loading live data</h4>
                            <p>Fetching the current read model for this operational tab.</p>
                          </div>
                        ) : filteredRows.length === 0 ? (
                          <div className="empty-state" role="status" aria-live="polite">
                            <div className="empty-state-icon"><Icon name="search" /></div>
                            <h4>{emptyStateCopyByView[currentView].title}</h4>
                            <p>{emptyStateCopyByView[currentView].description}</p>
                            <button className="secondary-button" type="button" onClick={() => setSearchQuery('')}>
                              Reset search
                            </button>
                          </div>
                        ) : (
                          <div className="table-scroll">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th scope="col">{isCustomerView ? 'Customer' : 'Record'}</th>
                                  <th scope="col">{isCustomerView ? 'Snapshot' : 'Summary'}</th>
                                  <th scope="col">Status</th>
                                  <th scope="col">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRows.map((row) => {
                                  const tone = getToneFromMeta(row.meta);

                                  return (
                                    <tr key={row.primary}>
                                      <td>
                                        <div className="table-primary-cell">
                                          <strong>{row.primary}</strong>
                                          <small>{row.meta}</small>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="table-metadata-pieces">
                                          {row.secondary.split(' • ').map((part) => (
                                            <span key={part} className="table-secondary-copy">{part}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`pill pill-${tone}`}>{row.meta}</span>
                                      </td>
                                      <td>
                                        <button className="table-action" type="button" onClick={() => openDialog({ title: row.primary, description: row.secondary, confirmLabel: getActionLabel(currentView), tone: tone === 'warn' ? 'danger' : 'default' })}>
                                          {getActionLabel(currentView)}
                                          <Icon name="launch" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      {renderWorkbench()}
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {dialogIntent ? (
        <div className="dialog-scrim" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Confirm action</p>
                <h3 id="dialog-title">{dialogIntent.title}</h3>
              </div>
              <button className="icon-button" type="button" aria-label="Close dialog" onClick={() => setDialogIntent(null)} disabled={isDialogBusy}>
                <Icon name="x" />
              </button>
            </div>

            <p className="dialog-copy">{dialogIntent.description}</p>

            <div className={dialogIntent.tone === 'danger' ? 'dialog-alert dialog-alert-danger' : 'dialog-alert'}>
              <Icon name={dialogIntent.tone === 'danger' ? 'alert' : 'check'} />
              <span>{dialogIntent.tone === 'danger' ? 'This action changes the current workflow and should be reviewed carefully.' : 'This action stays within the current page context and keeps the shell flow intact.'}</span>
            </div>

            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={() => setDialogIntent(null)} disabled={isDialogBusy}>
                Cancel
              </button>
              <button className={dialogIntent.tone === 'danger' ? 'danger-button' : 'primary-button'} type="button" onClick={() => void confirmDialog()} disabled={isDialogBusy}>
                {isDialogBusy ? 'Processing...' : dialogIntent.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
