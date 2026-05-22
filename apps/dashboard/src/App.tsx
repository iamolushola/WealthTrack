import { type ReactNode, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createApiClient, ApiError } from './api-client';
import { toast } from './toast';
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
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  team: string | null;
  days2Maturity: number | null;
};

type InvestmentsOverview = {
  items: InvestmentRecordItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  summary: {
    recordCount: number;
    totalInvestment: number;
    confirmedValidCount: number;
  };
};

type CommissionRecordItem = {
  id: string;
  customerId: string;
  customerName: string;
  customerType: 'new' | 'returning';
  relationshipManager: string | null;
  investmentAmount: string;
  mobilisationDate: string;
  fundType: 'inflow' | 'rollover';
  tenorDays: number;
  investmentReference: string | null;
  currency: string;
  sourceChannel: string | null;
  importStatus: string;
  wmNtbComm: string | null;
  wmRetnComm: string | null;
  tmNtbComm: string | null;
  tmRetnComm: string | null;
  omNtbComm: string | null;
  omRetnComm: string | null;
  ooNtbComm: string | null;
  ooRetnComm: string | null;
  wpFundsComm: string | null;
  wpTeamComm: string | null;
};

type CommissionsOverviewData = {
  items: CommissionRecordItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  summary: {
    wmNtbTotal: number;
    wmRetnTotal: number;
    tmNtbTotal: number;
    tmRetnTotal: number;
    omNtbTotal: number;
    omRetnTotal: number;
    ooNtbTotal: number;
    ooRetnTotal: number;
    wpFundsTotal: number;
    wpTeamTotal: number;
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
  status: 'pending' | 'processing' | 'validated' | 'importing' | 'failed' | 'imported' | 'partially_imported' | 'cancelled';
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

type IntegrationItem = {
  id: string;
  name: string;
  sourceType: 'api' | 'database' | 'google_sheets';
  status: 'active' | 'inactive' | 'failed';
  syncFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  lastTestedAt: string | null;
  lastSuccessfulSyncAt: string | null;
};

type SheetTabItem = {
  id: string;
  integrationSourceId: string;
  sheetId: string;
  sheetTitle: string;
  rangeNotation: string;
  columnMapping: Record<string, string>;
  status: 'active' | 'ignored';
  lastSyncedAt: string | null;
  lastRowCount: number | null;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleCode: string | null;
  roleName: string | null;
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
  | 'commissions'
  | 'uploads'
  | 'reports'
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
  tone: 'good' | 'info' | 'warn';
  message: string;
};

type DialogIntent = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
  onConfirm?: () => Promise<void> | void;
};

type DatePreset = 'all' | '7D' | '30D' | '90D' | 'quarter' | 'ytd' | 'custom';

type DetailRoute =
  | { kind: 'customer'; data: PortfolioCustomer; from: string }
  | { kind: 'investment'; data: InvestmentRecordItem; from: string }
  | { kind: 'manager'; data: WealthManagerRecord; from: string }
  | null;
const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'All time' },
  { id: '7D', label: 'Last 7D' },
  { id: '30D', label: 'Last 30D' },
  { id: '90D', label: 'Last 90D' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'ytd', label: 'YTD' },
  { id: 'custom', label: 'Custom' },
];

function presetToDateRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = fmt(today);
  if (preset === 'all' || preset === 'custom') return { from: '', to: '' };
  if (preset === '7D') { const f = new Date(today); f.setDate(today.getDate() - 6); return { from: fmt(f), to: todayStr }; }
  if (preset === '30D') { const f = new Date(today); f.setDate(today.getDate() - 29); return { from: fmt(f), to: todayStr }; }
  if (preset === '90D') { const f = new Date(today); f.setDate(today.getDate() - 89); return { from: fmt(f), to: todayStr }; }
  if (preset === 'quarter') { const f = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1); return { from: fmt(f), to: todayStr }; }
  if (preset === 'ytd') { const f = new Date(today.getFullYear(), 0, 1); return { from: fmt(f), to: todayStr }; }
  return { from: '', to: '' };
}

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
  | 'moon'
  | 'eye'
  | 'eye-off'
  | 'edit';



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
    'uploads.csv.create',
    'uploads.delete',
    'uploads.preview.read',
    'uploads.import.confirm',
    'users.read',
    'users.create',
    'users.update',
    'users.deactivate',
    'settings.update',
    'reports.export',
    'integrations.read',
    'integrations.create',
    'integrations.update',
    'integrations.delete',
    'integrations.sync.trigger',
    'integrations.logs.read',
  ].join(','),
};

// Module-level API client — bound once to the base URL and auth headers.
const api = createApiClient(API_BASE_URL, dashboardRequestHeaders);

// Unauthenticated client for public endpoints (login, forgot-password, etc.)
const publicApi = createApiClient(API_BASE_URL, {});

// Session idle timeout: sign out after 8 hours of inactivity.
// Warn the user 5 minutes before the deadline.
const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const IDLE_WARN_BEFORE_MS = 5 * 60 * 1000;

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

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

function formatCurrencyCode(code: string | null | undefined): string {
  return CURRENCY_SYMBOLS[code ?? ''] ?? (code || 'NGN');
}

function formatCurrency(value: number | null | undefined, currencyCode = 'NGN'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  return `${symbol}${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
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

function backLabelFromPath(from: string): string {
  if (from.startsWith('/portfolio')) return 'Back to Customers';
  if (from.startsWith('/investments')) return 'Back to Investments';
  if (from.startsWith('/wealth-managers')) return 'Back to Managers';
  if (from.startsWith('/uploads')) return 'Back to Uploads';
  if (from.startsWith('/reports')) return 'Back to Reports';
  if (from.startsWith('/users')) return 'Back to Users';
  if (from.startsWith('/summary')) return 'Back to Summary';
  if (from.startsWith('/trends')) return 'Back to Trends';
  if (from === '/') return 'Back to Home';
  return 'Back';
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
  // Analytics
  { label: 'Overview', icon: 'grid', view: 'summary' },
  { label: 'Trends', icon: 'chart', view: 'trends' },
  { label: 'Reports', icon: 'file', view: 'reports' },
  // Portfolio
  { label: 'Customers', icon: 'wallet', view: 'portfolio' },
  { label: 'Investments', icon: 'database', view: 'investments' },
  { label: 'Managers', icon: 'users', view: 'wealth-managers' },
  { label: 'Commissions', icon: 'spark', view: 'commissions' },
  // Uploads
  { label: 'Uploads', icon: 'briefcase', view: 'uploads' },
  // Administration
  { label: 'Team', icon: 'users', view: 'users' },
  { label: 'Settings', icon: 'settings', view: 'settings' },
];

const navigationSections: NavSection[] = [
  {
    title: 'Analytics',
    items: navigationItems.filter((item) => ['summary', 'trends', 'reports'].includes(item.view)),
  },
  {
    title: 'Portfolio',
    items: navigationItems.filter((item) => ['portfolio', 'investments', 'wealth-managers', 'commissions'].includes(item.view)),
  },
  {
    title: 'Uploads',
    items: navigationItems.filter((item) => item.view === 'uploads'),
  },
  {
    title: 'Administration',
    items: navigationItems.filter((item) => ['users', 'settings'].includes(item.view)),
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
    heroTitle: 'Wealth manager performance.',
    heroDescription: 'AUM, customer mix, and funds aging by relationship manager.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Refresh',
    periodLabel: 'Manager AUM view',
    statusLabel: 'Live',
  },
  {
    id: 'commissions',
    label: 'Commissions',
    title: 'Commissions',
    badge: 'RM',
    heroTitle: 'Manager commission book.',
    heroDescription: 'AUM and investment performance attributed per relationship manager.',
    actionLabel: 'Export',
    secondaryActionLabel: 'Refresh',
    periodLabel: 'All managers',
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


const emptyStateCopyByView: Record<ViewId, { title: string; description: string }> = {
  summary: { title: 'No summary signals match that search', description: 'Try a broader keyword to restore the executive overview rows.' },
  trends: { title: 'No trend rows match that search', description: 'Use a broader search term or reset filters to inspect the full trend set.' },
  portfolio: { title: 'No customers match that search', description: 'Search by another customer name or ID to restore the ranked portfolio list.' },
  investments: { title: 'No investment records match that search', description: 'Search by customer, reference, source channel, or relationship manager.' },
  'wealth-managers': { title: 'No managers match that search', description: 'Clear the current search to recover the full relationship-manager leaderboard.' },
  commissions: { title: 'No commission records', description: 'No investment records are attributed to a relationship manager.' },
  uploads: { title: 'No upload records match that search', description: 'Reset the filters to review pending batches and error reports.' },
  reports: { title: 'No report jobs match that search', description: 'Try another keyword to bring queued and completed exports back into view.' },
  users: { title: 'No users match that search', description: 'Clear the search to restore the team list.' },
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
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="M10.7 5.1A10 10 0 0 1 12 5c7 0 10 7 10 7a17.4 17.4 0 0 1-2.5 3.7" /><path d="M6.5 6.5A17.4 17.4 0 0 0 2 12s3 7 10 7a9.9 9.9 0 0 0 5.5-1.6" /><path d="M14.8 14.8A3 3 0 1 1 9.2 9.2" /><path d="m2 2 20 20" /></>,
    edit: <><path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3" /><path d="m13.5 6.5 3 3" /></>,
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

function AgingBar({ items, total, compact = false }: { items: ReturnType<typeof getFundsAgingDisplayItems>; total: number; compact?: boolean }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const hovered = items.find((i) => i.key === hoveredKey);

  return (
    <div className="aging-bar-root">
      <div className={compact ? 'wealth-aging-stack compact' : 'wealth-aging-stack'} aria-label="Funds aging distribution">
        {items.map((item) => (
          <span
            key={item.key}
            className={`wealth-aging-segment wealth-aging-segment-${item.key}`}
            style={{ width: `${total ? Math.max((item.value / total) * 100, item.value > 0 ? 4 : 0) : 0}%` }}
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
            aria-label={`${item.label}: ${formatCurrency(item.value)}`}
          />
        ))}
      </div>
      {hovered && hovered.value > 0 ? (
        <div className="aging-bar-tooltip">
          <span className={`aging-bar-tooltip-dot aging-bar-tooltip-dot-${hovered.key}`} />
          <span className="aging-bar-tooltip-label">{hovered.label}</span>
          <strong className="aging-bar-tooltip-value">{formatCurrency(hovered.value)}</strong>
          <span className="aging-bar-tooltip-count">{formatCount(hovered.count)} investments</span>
        </div>
      ) : (
        <div className="aging-bar-tooltip aging-bar-tooltip-empty" />
      )}
    </div>
  );
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

function filterByDateRange(items: ReportExportItem[], from: string, to: string): ReportExportItem[] {
  if (!from && !to) return items;
  const lower = from ? new Date(`${from}T00:00:00`) : null;
  const upper = to   ? new Date(`${to}T23:59:59`)   : null;
  return items.filter((item) => {
    const d = new Date(item.createdAt);
    if (Number.isNaN(d.getTime())) return false;
    if (lower && d < lower) return false;
    if (upper && d > upper) return false;
    return true;
  });
}

// ── Paginator ────────────────────────────────────────────────────────────────

interface PaginatorProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function Paginator({ page, totalPages, totalItems, pageSize, isLoading, onPageChange }: PaginatorProps): ReactNode {
  function buildChips(): Array<number | 'ellipsis-before' | 'ellipsis-after'> {
    const chips: Array<number | 'ellipsis-before' | 'ellipsis-after'> = [];
    const add = (n: number) => { if (!chips.includes(n)) chips.push(n); };
    add(1);
    if (page > 3) chips.push('ellipsis-before');
    if (page > 2) add(page - 1);
    add(page);
    if (page < totalPages - 1) add(page + 1);
    if (page < totalPages - 2) chips.push('ellipsis-after');
    if (totalPages > 1) add(totalPages);
    return chips;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const chips = buildChips();

  return (
    <div className="customer-pagination">
      <span>
        {isLoading ? 'Loading…' : totalItems > 0 ? `Showing ${from}–${to} of ${totalItems}` : '0 records'}
      </span>
      {totalPages > 1 && (
        <div>
          <button type="button" disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)} aria-label="Previous page">Prev</button>
          {chips.map((chip) =>
            typeof chip === 'string'
              ? <span key={chip} className="pagination-ellipsis">…</span>
              : <button key={chip} type="button" className={chip === page ? 'page-chip-active' : undefined} aria-current={chip === page ? 'page' : undefined} disabled={isLoading} onClick={() => onPageChange(chip)}>{chip}</button>
          )}
          <button type="button" disabled={page >= totalPages || isLoading} onClick={() => onPageChange(page + 1)} aria-label="Next page">Next</button>
        </div>
      )}
    </div>
  );
}

type RoleItem = { id: string; code: string; name: string; description: string | null; isSystem?: boolean };
type PermissionItem = { id: string; code: string; description: string | null };
type RoleWithPermissions = RoleItem & { permissionCodes: string[] };
type RolePermissionsMatrix = { roles: RoleWithPermissions[]; permissions: PermissionItem[] };

// ─── Session management ────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = 'wt.session';

type Session = {
  sessionId: string;
  actorId: string;
  actorType: 'admin' | 'analyst' | 'uploader' | 'system';
  roleCode: string;
  name: string;
  email: string;
  permissions: string[];
};

function mapRoleToActorType(roleCode: string): Session['actorType'] {
  if (roleCode === 'analyst' || roleCode === 'viewer') return 'analyst';
  if (roleCode === 'uploader') return 'uploader';
  return 'admin';
}

function loadStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function persistSession(s: Session): void {
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s)); } catch { /* quota exceeded */ }
}

function eraseSession(): void {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
}

async function apiMutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  return api.mutate<T>(method, path, body);
}

function App() {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    Dashboards: false,
    Operations: false,
    Governance: false,
    System: false,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [trendsPeriod, setTrendsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [trendsFrom, setTrendsFrom] = useState('');
  const [trendsTo, setTrendsTo] = useState('');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wt-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedUploadName, setSelectedUploadName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [investmentsPage, setInvestmentsPage] = useState(1);
  const [commissionsPage, setCommissionsPage] = useState(1);
  const [usersTab, setUsersTab] = useState<'admins' | 'roles'>('admins');
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security' | 'config' | 'notifications'>('profile');
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', userType: '' });
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [rolesData, setRolesData] = useState<RequestState<{ items: RoleItem[]; count: number }>>({ status: 'idle', data: null, error: null });
  const [roleMatrix, setRoleMatrix] = useState<RequestState<RolePermissionsMatrix>>({ status: 'idle', data: null, error: null });
  const [userDrawer, setUserDrawer] = useState<{ mode: 'invite' | 'edit' | null; userId?: string }>({ mode: null });
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', roleCode: 'analyst' });
  const [editForm, setEditForm] = useState({ name: '', email: '', roleCode: '', status: '' });
  const [newRoleForm, setNewRoleForm] = useState({ name: '', code: '', description: '' });
  const [showCreateRoleDrawer, setShowCreateRoleDrawer] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savedRoleId, setSavedRoleId] = useState<string | null>(null);
  const [reportsOverview, setReportsOverview] = useState<ReportsOverviewState>({
    status: 'idle',
    items: [],
    error: null,
  });
  const [, setHealth] = useState<HealthState>({
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
      '/commissions': 'commissions',
      '/uploads': 'uploads',
      '/reports': 'reports',
      '/users': 'users',
      '/settings': 'settings',
    };
    return pathMap[location.pathname] ?? 'portfolio';
  }, [location.pathname]);

  const detailRoute = useMemo<DetailRoute>(() => {
    const state = location.state as Record<string, unknown> | null;
    const from = (state?.from as string | undefined) ?? '';
    if (location.pathname.startsWith('/portfolio/') && location.pathname.length > '/portfolio/'.length) {
      const customer = state?.customer as PortfolioCustomer | undefined;
      if (customer?.customerId) return { kind: 'customer', data: customer, from: from || '/portfolio' };
    }
    if (location.pathname.startsWith('/investments/') && location.pathname.length > '/investments/'.length) {
      const investment = state?.investment as InvestmentRecordItem | undefined;
      if (investment?.id) return { kind: 'investment', data: investment, from: from || '/investments' };
    }
    if (location.pathname.startsWith('/wealth-managers/') && location.pathname.length > '/wealth-managers/'.length) {
      const manager = state?.manager as WealthManagerRecord | undefined;
      if (manager?.relationshipManager) return { kind: 'manager', data: manager, from: from || '/wealth-managers' };
    }
    return null;
  }, [location.pathname, location.state]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCustomerStatus, setActiveCustomerStatus] = useState<CustomerStatus>('all');

  type InvestmentFilterState = {
    customerType: '' | 'new' | 'returning';
    fundType: '' | 'inflow' | 'rollover';
    importStatus: '' | 'confirmed' | 'pending' | 'rejected';
    tenorCategory: '' | 'short_term' | 'mid_short_term' | 'medium_term' | 'long_term';
    from: string;
    to: string;
  };
  type CommissionFilterState = {
    customerType: '' | 'new' | 'returning';
    fundType: '' | 'inflow' | 'rollover';
    from: string;
    to: string;
  };

  const emptyInvestmentFilters: InvestmentFilterState = { customerType: '', fundType: '', importStatus: '', tenorCategory: '', from: '', to: '' };
  const emptyCommissionFilters: CommissionFilterState = { customerType: '', fundType: '', from: '', to: '' };

  const [investmentFilters, setInvestmentFilters] = useState<InvestmentFilterState>(emptyInvestmentFilters);
  const [commissionFilters, setCommissionFilters] = useState<CommissionFilterState>(emptyCommissionFilters);
  const [openFilterPanel, setOpenFilterPanel] = useState<'investments' | 'commissions' | 'managers' | null>(null);

  type ManagerFilterState = { customerFocus: '' | 'new' | 'returning' };
  const emptyManagerFilters: ManagerFilterState = { customerFocus: '' };
  const [managerFilters, setManagerFilters] = useState<ManagerFilterState>(emptyManagerFilters);
  // Per-page date filter state
  const [summaryPreset, setSummaryPreset] = useState<DatePreset>('all');
  const [summaryFrom, setSummaryFrom] = useState(() => presetToDateRange('all').from);
  const [summaryTo, setSummaryTo] = useState(() => presetToDateRange('all').to);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  const [reportsPreset, setReportsPreset] = useState<DatePreset>('all');
  const [reportsFrom, setReportsFrom] = useState(() => presetToDateRange('all').from);
  const [reportsTo, setReportsTo] = useState(() => presetToDateRange('all').to);

  const [trendsPreset, setTrendsPreset] = useState<DatePreset>('all');
  const [dialogIntent, setDialogIntent] = useState<DialogIntent | null>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [session, setSession] = useState<Session | null>(() => {
    const stored = loadStoredSession();
    if (stored) {
      Object.assign(dashboardRequestHeaders, {
        'x-actor-id': stored.actorId,
        'x-actor-type': stored.actorType,
        'x-session-id': stored.sessionId,
        'x-permissions': stored.permissions.join(','),
      });
    }
    return stored;
  });
  // Derived: only super_admin and admin can manage the team (invite, edit, view the Team page)
  const canManageTeam = session?.roleCode === 'super_admin' || session?.roleCode === 'admin';
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  // Forgot-password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  // Reset / set-password state
  const [resetPwd, setResetPwd] = useState('');
  const [resetConfirmPwd, setResetConfirmPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);
  // OTP change-password state (non-super-admin)
  const [otpStep, setOtpStep] = useState<'idle' | 'otp-sent'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPwd, setOtpNewPwd] = useState('');
  const [otpConfirmPwd, setOtpConfirmPwd] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showOtpPwd, setShowOtpPwd] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [customerDrawer, setCustomerDrawer] = useState<PortfolioCustomer | null>(null);
  const [investmentDrawer, setInvestmentDrawer] = useState<InvestmentRecordItem | null>(null);
  const [managerDrawer, setManagerDrawer] = useState<WealthManagerRecord | null>(null);
  const [reportDrawer, setReportDrawer] = useState<ReportExportItem | null>(null);
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
  const [commissionsOverview, setCommissionsOverview] = useState<RequestState<CommissionsOverviewData>>({
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
  const [integrationsState, setIntegrationsState] = useState<RequestState<{ items: IntegrationItem[]; count: number }>>({ status: 'idle', data: null, error: null });
  const [gSheetFormOpen, setGSheetFormOpen] = useState(false);
  const [gSheetForm, setGSheetForm] = useState({ name: '', spreadsheetUrl: '', credentialsJson: '', syncFrequency: 'daily' as 'manual' | 'daily' | 'weekly' | 'monthly' });
  const [gSheetBusy, setGSheetBusy] = useState<string | null>(null);
  const [integrationTabs, setIntegrationTabs] = useState<Record<string, SheetTabItem[]>>({});
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);

  async function fetchViewData<T>(path: string): Promise<T> {
    return api.get<T>(path);
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
    setActiveCustomerStatus('all');
    setInvestmentFilters(emptyInvestmentFilters);
    setCommissionFilters(emptyCommissionFilters);
    setManagerFilters(emptyManagerFilters);
    setOpenFilterPanel(null);
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setInvestmentsPage(1);
      setPortfolioPage(1);
      setCommissionsPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  // When on a detail-route URL but no state (e.g. direct URL entry or expired state),
  // redirect to the parent list view so the page is never blank.
  useEffect(() => {
    const detailPrefixes = ['/investments/', '/portfolio/', '/wealth-managers/'];
    const isDetailPath = detailPrefixes.some(
      (prefix) => location.pathname.startsWith(prefix) && location.pathname.length > prefix.length,
    );
    if (isDetailPath && detailRoute === null) {
      const parent = '/' + location.pathname.split('/')[1];
      navigate(parent, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, detailRoute]);

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
        const payload = await api.get<{ items?: ReportExportItem[] }>('reports');

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
    if (!['summary', 'reports'].includes(currentView)) {
      return undefined;
    }

    let cancelled = false;
    setSummaryOverview({ status: 'loading', data: null, error: null });

    const params = new URLSearchParams();
    const from = currentView === 'reports' ? reportsFrom : summaryFrom;
    const to = currentView === 'reports' ? reportsTo : summaryTo;
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();

    void fetchViewData<SummaryOverview>(`dashboard/summary${qs ? `?${qs}` : ''}`)
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
  }, [currentView, reportsFrom, reportsTo, summaryFrom, summaryTo, summaryRefreshKey]);

  useEffect(() => {
    if (!['summary', 'trends', 'reports'].includes(currentView)) {
      return undefined;
    }

    let cancelled = false;
    setTrendsOverview({ status: 'loading', data: null, error: null });

    const params = new URLSearchParams();
    const from = currentView === 'summary' ? summaryFrom : currentView === 'reports' ? reportsFrom : trendsFrom;
    const to = currentView === 'summary' ? summaryTo : currentView === 'reports' ? reportsTo : trendsTo;
    if (from) params.set('from', from);
    if (to) params.set('to', to);
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
  }, [currentView, reportsFrom, reportsTo, summaryFrom, summaryTo, summaryRefreshKey, trendsFrom, trendsTo]);

  useEffect(() => {
    if (currentView !== 'portfolio') {
      return undefined;
    }

    let cancelled = false;
    setPortfolioOverview((prev) => ({ ...prev, status: 'loading', error: null }));

    void fetchViewData<CustomerPortfolioOverview>(`dashboard/customer-portfolio?page=${portfolioPage}&pageSize=25${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ''}`)
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
  }, [currentView, portfolioPage, debouncedQuery]);

  useEffect(() => {
    if (currentView !== 'investments') {
      return undefined;
    }

    let cancelled = false;
    setInvestmentsOverview((prev) => ({ ...prev, status: 'loading', error: null }));

    const investmentParams = new URLSearchParams({ page: String(investmentsPage), pageSize: '50' });
    if (debouncedQuery) investmentParams.set('q', debouncedQuery);
    if (investmentFilters.customerType) investmentParams.set('customerType', investmentFilters.customerType);
    if (investmentFilters.fundType) investmentParams.set('fundType', investmentFilters.fundType);
    if (investmentFilters.importStatus) investmentParams.set('importStatus', investmentFilters.importStatus);
    if (investmentFilters.tenorCategory) investmentParams.set('tenorCategory', investmentFilters.tenorCategory);
    if (investmentFilters.from) investmentParams.set('from', investmentFilters.from);
    if (investmentFilters.to) investmentParams.set('to', investmentFilters.to);

    void fetchViewData<InvestmentsOverview>(`investments?${investmentParams.toString()}`)
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
  }, [currentView, investmentsPage, debouncedQuery, investmentFilters]);

  useEffect(() => {
    if (currentView !== 'commissions') {
      return undefined;
    }

    let cancelled = false;
    setCommissionsOverview((prev) => ({ ...prev, status: 'loading', error: null }));

    const commissionParams = new URLSearchParams({ page: String(commissionsPage), pageSize: '50' });
    if (debouncedQuery) commissionParams.set('q', debouncedQuery);
    if (commissionFilters.customerType) commissionParams.set('customerType', commissionFilters.customerType);
    if (commissionFilters.fundType) commissionParams.set('fundType', commissionFilters.fundType);
    if (commissionFilters.from) commissionParams.set('from', commissionFilters.from);
    if (commissionFilters.to) commissionParams.set('to', commissionFilters.to);

    void fetchViewData<CommissionsOverviewData>(`investments/commissions?${commissionParams.toString()}`)
      .then((data) => {
        if (!cancelled) {
          setCommissionsOverview({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCommissionsOverview({
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
  }, [currentView, commissionsPage, debouncedQuery, commissionFilters]);

  // Redirect users who lack team-management access away from /users
  useEffect(() => {
    if (session && !canManageTeam && currentView === 'users') {
      navigate('/summary');
    }
  }, [session, canManageTeam, currentView, navigate]);

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

  // Load available roles whenever the users page is open (for invite/edit dropdowns)
  useEffect(() => {
    if (currentView !== 'users' || rolesData.status !== 'idle') return undefined;
    let cancelled = false;
    setRolesData({ status: 'loading', data: null, error: null });
    void fetchViewData<{ items: RoleItem[]; count: number }>('roles')
      .then((data) => { if (!cancelled) setRolesData({ status: 'ready', data, error: null }); })
      .catch((err: unknown) => { if (!cancelled) setRolesData({ status: 'error', data: null, error: err instanceof Error ? err.message : 'Unknown error' }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Load role-permissions matrix when Roles & Permissions tab opens
  useEffect(() => {
    if (currentView !== 'users' || usersTab !== 'roles' || roleMatrix.status !== 'idle') return undefined;
    let cancelled = false;
    setRoleMatrix({ status: 'loading', data: null, error: null });
    void fetchViewData<RolePermissionsMatrix>('role-permissions')
      .then((data) => { if (!cancelled) setRoleMatrix({ status: 'ready', data, error: null }); })
      .catch((err: unknown) => { if (!cancelled) setRoleMatrix({ status: 'error', data: null, error: err instanceof Error ? err.message : 'Unknown error' }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, usersTab]);

  // Load integrations when Settings → Config tab is open
  useEffect(() => {
    if (currentView !== 'settings' || settingsTab !== 'config' || integrationsState.status !== 'idle') return undefined;
    let cancelled = false;
    setIntegrationsState({ status: 'loading', data: null, error: null });
    void fetchViewData<{ items: IntegrationItem[]; count: number }>('integrations')
      .then((data) => { if (!cancelled) setIntegrationsState({ status: 'ready', data, error: null }); })
      .catch((err: unknown) => { if (!cancelled) setIntegrationsState({ status: 'error', data: null, error: err instanceof Error ? err.message : 'Unknown error' }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, settingsTab]);

  const currentDefinition = views.find((view) => view.id === currentView) ?? views[0];
  const summaryData = summaryOverview.data;
  const trendsData = trendsOverview.data;
  const portfolioItems = portfolioOverview.data?.items ?? [];
  const investmentItems = investmentsOverview.data?.items ?? [];
  const investmentSummary = investmentsOverview.data?.summary;
  const wealthManagerItems = wealthManagersOverview.data?.items ?? [];
  const uploadItems = uploadsOverview.data?.items ?? [];
  const userItems = usersOverview.data?.items ?? [];
  const settingsData = settingsOverview.data;
  const reportItemsInRange = filterByDateRange(reportsOverview.items, reportsFrom, reportsTo);
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
          helper: 'Records on current page',
          tone: 'neutral',
          delta: investmentsOverview.data ? `Page ${investmentsOverview.data.page} of ${investmentsOverview.data.totalPages}` : 'Loading',
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

    if (currentView === 'commissions') {
      const s = commissionsOverview.data?.summary;
      const totalItems = commissionsOverview.data?.totalItems ?? 0;
      const wpTotal = (s?.wpFundsTotal ?? 0) + (s?.wpTeamTotal ?? 0);
      const wmTotal = (s?.wmNtbTotal ?? 0) + (s?.wmRetnTotal ?? 0);
      const tmTotal = (s?.tmNtbTotal ?? 0) + (s?.tmRetnTotal ?? 0);
      const omTotal = (s?.omNtbTotal ?? 0) + (s?.omRetnTotal ?? 0);
      const ooTotal = (s?.ooNtbTotal ?? 0) + (s?.ooRetnTotal ?? 0);
      const grandTotal = wpTotal + wmTotal + tmTotal + omTotal + ooTotal;

      return [
        {
          label: 'Total Commission',
          value: grandTotal > 0 ? formatCurrency(grandTotal) : '--',
          helper: 'Sum of all commission categories across all records',
          tone: grandTotal > 0 ? 'good' : 'neutral',
          delta: `${formatCount(totalItems)} investment records`,
          icon: 'wallet',
        },
        {
          label: 'WP Funds Commission',
          value: s ? formatCurrency(s.wpFundsTotal) : '--',
          helper: 'Wealth Point funds commission (WP.Funds.Comm)',
          tone: (s?.wpFundsTotal ?? 0) > 0 ? 'good' : 'neutral',
          delta: s ? `WP Team: ${formatCurrency(s.wpTeamTotal)}` : 'Loading',
          icon: 'spark',
        },
        {
          label: 'WM Commission',
          value: wmTotal > 0 ? formatCurrency(wmTotal) : '--',
          helper: 'Wealth Manager NTB + Returning commissions',
          tone: wmTotal > 0 ? 'good' : 'neutral',
          delta: s ? `NTB: ${formatCurrency(s.wmNtbTotal)} · Retn: ${formatCurrency(s.wmRetnTotal)}` : 'Loading',
          icon: 'users',
        },
        {
          label: 'TM Commission',
          value: tmTotal > 0 ? formatCurrency(tmTotal) : '--',
          helper: 'Team Manager NTB + Returning commissions',
          tone: tmTotal > 0 ? 'good' : 'neutral',
          delta: s ? `NTB: ${formatCurrency(s.tmNtbTotal)} · Retn: ${formatCurrency(s.tmRetnTotal)}` : 'Loading',
          icon: 'briefcase',
        },
        {
          label: 'OM Commission',
          value: omTotal > 0 ? formatCurrency(omTotal) : '--',
          helper: 'Operations Manager NTB + Returning commissions',
          tone: omTotal > 0 ? 'good' : 'neutral',
          delta: s ? `NTB: ${formatCurrency(s.omNtbTotal)} · Retn: ${formatCurrency(s.omRetnTotal)}` : 'Loading',
          icon: 'database',
        },
        {
          label: 'OO Commission',
          value: ooTotal > 0 ? formatCurrency(ooTotal) : '--',
          helper: 'Operations Officer NTB + Returning commissions',
          tone: ooTotal > 0 ? 'good' : 'neutral',
          delta: s ? `NTB: ${formatCurrency(s.ooNtbTotal)} · Retn: ${formatCurrency(s.ooRetnTotal)}` : 'Loading',
          icon: 'shield',
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
      case 'commissions':
        return commissionsOverview;
      case 'uploads':
        return uploadsOverview;
      case 'users':
        return usersOverview;
      case 'settings':
        return settingsOverview;
      default:
        return reportsOverview;
    }
  })();

  const navCounts: Partial<Record<ViewId, string>> = {
    investments: investmentsOverview.data ? formatCount(investmentsOverview.data.totalItems) : undefined,
    uploads: uploadsOverview.data ? formatCount(uploadsOverview.data.count) : undefined,
    reports: reportsOverview.items.length > 0 ? formatCount(reportsOverview.items.length) : undefined,
    users: usersOverview.data ? formatCount(usersOverview.data.count) : undefined,
  };
  const isCustomerView = currentView === 'summary' || currentView === 'trends' || currentView === 'portfolio' || currentView === 'wealth-managers';
  const filteredRows = currentRows.filter((row) => {
    const haystack = `${row.primary} ${row.secondary} ${row.meta}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });
  const filteredCustomers = portfolioItems.filter((customer) => {
    return activeCustomerStatus === 'all' || customer.customerType === activeCustomerStatus;
  });
  const filteredWealthManagers = wealthManagerItems.filter((manager) => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const haystack = [
        manager.relationshipManager,
        ...manager.topCustomers.map((c) => c.customerName),
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (managerFilters.customerFocus === 'new') {
      return manager.ntbMetrics.customerCount >= manager.returningCustomerMetrics.customerCount;
    }
    if (managerFilters.customerFocus === 'returning') {
      return manager.returningCustomerMetrics.customerCount > manager.ntbMetrics.customerCount;
    }
    return true;
  });
  // Investments are filtered server-side; use items from API response directly.
  const filteredInvestmentItems = investmentItems;
  const filteredCountLabel = `${filteredRows.length} of ${currentRows.length} visible`;

  function selectView(view: ViewId): void {
    const viewPaths: Record<ViewId, string> = {
      summary: '/summary',
      trends: '/trends',
      portfolio: '/portfolio',
      investments: '/investments',
      'wealth-managers': '/wealth-managers',
      commissions: '/commissions',
      uploads: '/uploads',
      reports: '/reports',
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

  function openDialog(intent: DialogIntent): void {
    setDialogIntent(intent);
  }

  function processUploadFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setNotice({ tone: 'warn', message: 'Only CSV files are supported.' });
      return;
    }
    setUploadedFile(file);
    setSelectedUploadName(file.name);
    setNotice(null);
  }

  function handleUploadSelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    processUploadFile(file);
  }

  function handleDragOver(event: React.DragEvent): void {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent): void {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent): void {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processUploadFile(file);
  }

  function handleLogout(): void {
    void api.mutate('POST', 'auth/logout').catch(() => { /* session may already be gone */ });
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    eraseSession();
    setSession(null);
    setShowIdleWarning(false);
    setIsLoggedOut(true);
  }

  async function handleLogin(): Promise<void> {
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Email and password are required'); return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await publicApi.mutate<{
        sessionId: string;
        user: { id: string; name: string; email: string; roleCode: string; permissions: string[] };
      }>('POST', 'auth/login', { email: loginEmail.trim(), password: loginPassword });

      const actorType = mapRoleToActorType(result.user.roleCode);
      const newSession: Session = {
        sessionId: result.sessionId,
        actorId: result.user.id,
        actorType,
        roleCode: result.user.roleCode,
        name: result.user.name,
        email: result.user.email,
        permissions: result.user.permissions,
      };
      Object.assign(dashboardRequestHeaders, {
        'x-actor-id': newSession.actorId,
        'x-actor-type': newSession.actorType,
        'x-session-id': newSession.sessionId,
        'x-permissions': newSession.permissions.join(','),
      });
      persistSession(newSession);
      setSession(newSession);
      setIsLoggedOut(false);
      setLoginPassword('');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleForgotPassword(): Promise<void> {
    if (!forgotEmail.trim()) { setForgotError('Email is required'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await publicApi.mutate('POST', 'auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSent(true);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPassword(tokenId: string, token: string, purpose: 'reset' | 'set'): Promise<void> {
    if (resetPwd.length < 8) { setResetError('Password must be at least 8 characters'); return; }
    if (resetPwd !== resetConfirmPwd) { setResetError('Passwords do not match'); return; }
    setResetLoading(true);
    setResetError('');
    try {
      const endpoint = purpose === 'set' ? 'auth/set-password' : 'auth/reset-password';
      await publicApi.mutate('POST', endpoint, { tokenId, token, newPassword: resetPwd });
      setResetDone(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleRequestOtp(): Promise<void> {
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.mutate('POST', 'auth/change-password/request');
      setOtpStep('otp-sent');
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleConfirmOtp(): Promise<void> {
    if (!otpCode || otpCode.length < 6) { setOtpError('Enter the 6-digit code'); return; }
    if (otpNewPwd.length < 8) { setOtpError('Password must be at least 8 characters'); return; }
    if (otpNewPwd !== otpConfirmPwd) { setOtpError('Passwords do not match'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await api.mutate('POST', 'auth/change-password/confirm', { otp: otpCode, newPassword: otpNewPwd });
      setOtpStep('idle');
      setOtpCode('');
      setOtpNewPwd('');
      setOtpConfirmPwd('');
      setNotice({ message: 'Password changed successfully', tone: 'info' });
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setOtpLoading(false);
    }
  }

  // Auto-dismiss the notice banner after 5 seconds
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Idle session timeout — resets on any user interaction.
  useEffect(() => {
    function resetTimers(): void {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      setShowIdleWarning(false);
      warnTimerRef.current = setTimeout(
        () => setShowIdleWarning(true),
        IDLE_TIMEOUT_MS - IDLE_WARN_BEFORE_MS,
      );
      idleTimerRef.current = setTimeout(() => {
        setIsLoggedOut(true);
      }, IDLE_TIMEOUT_MS);
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmDialog(): Promise<void> {
    if (!dialogIntent) return;
    setIsDialogBusy(true);
    try {
      if (dialogIntent.onConfirm) {
        await dialogIntent.onConfirm();
      }
    } catch (err: unknown) {
      setNotice({ tone: 'warn', message: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setIsDialogBusy(false);
      setDialogIntent(null);
    }
  }

  function updateInvestmentFilter<K extends keyof InvestmentFilterState>(key: K, value: InvestmentFilterState[K]): void {
    setInvestmentFilters((prev) => ({ ...prev, [key]: value }));
    setInvestmentsPage(1);
  }

  function updateCommissionFilter<K extends keyof CommissionFilterState>(key: K, value: CommissionFilterState[K]): void {
    setCommissionFilters((prev) => ({ ...prev, [key]: value }));
    setCommissionsPage(1);
  }

  const activeInvestmentFilterCount = Object.values(investmentFilters).filter((v) => v !== '').length;
  const activeCommissionFilterCount = Object.values(commissionFilters).filter((v) => v !== '').length;

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
            <button
              className={`customer-filter-button${openFilterPanel === 'investments' ? ' customer-filter-button-active' : ''}`}
              type="button"
              onClick={() => setOpenFilterPanel(openFilterPanel === 'investments' ? null : 'investments')}
            >
              <Icon name="filter" />
              Ledger filters
              {activeInvestmentFilterCount > 0 && <span className="filter-badge">{activeInvestmentFilterCount}</span>}
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => setNotice({ tone: 'warn', message: 'Investment export is not yet configured on this environment.' })}>
              Export
            </button>
          </div>
          {openFilterPanel === 'investments' && (
            <div className="filter-panel">
              <div className="filter-panel-section">
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Customer Class</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['new', 'NTB'], ['returning', 'Returning']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${investmentFilters.customerType === val ? ' filter-pill-active' : ''}`} onClick={() => updateInvestmentFilter('customerType', val as InvestmentFilterState['customerType'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Fund Type</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['inflow', 'Inflow'], ['rollover', 'Rollover']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${investmentFilters.fundType === val ? ' filter-pill-active' : ''}`} onClick={() => updateInvestmentFilter('fundType', val as InvestmentFilterState['fundType'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Status</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['confirmed', 'Confirmed'], ['pending', 'Pending'], ['rejected', 'Rejected']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${investmentFilters.importStatus === val ? ' filter-pill-active' : ''}`} onClick={() => updateInvestmentFilter('importStatus', val as InvestmentFilterState['importStatus'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Funds Class</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['short_term', 'Short Term'], ['mid_short_term', 'Mid-Short'], ['medium_term', 'Medium'], ['long_term', 'Long Term']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${investmentFilters.tenorCategory === val ? ' filter-pill-active' : ''}`} onClick={() => updateInvestmentFilter('tenorCategory', val as InvestmentFilterState['tenorCategory'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Date Range</span>
                  <div className="filter-date-inputs">
                    <input type="date" value={investmentFilters.from} onChange={(e) => updateInvestmentFilter('from', e.target.value)} />
                    <span>–</span>
                    <input type="date" value={investmentFilters.to} onChange={(e) => updateInvestmentFilter('to', e.target.value)} />
                  </div>
                </div>
              </div>
              {activeInvestmentFilterCount > 0 && (
                <button type="button" className="filter-panel-clear" onClick={() => { setInvestmentFilters(emptyInvestmentFilters); setInvestmentsPage(1); }}>Clear all filters</button>
              )}
            </div>
          )}
        </div>

        {filteredInvestmentItems.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="search" /></div>
            <h4>No investment records match those filters</h4>
            <p>Search by customer, reference, source channel, relationship manager, or adjust the active filters.</p>
            <button className="secondary-button" type="button" onClick={() => { setSearchQuery(''); setInvestmentFilters(emptyInvestmentFilters); setInvestmentsPage(1); }}>
              Reset search &amp; filters
            </button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Investment ID</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Class</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Inflow</th>
                    <th scope="col">Rollover</th>
                    <th scope="col">Act. Officer</th>
                    <th scope="col">Funds Class</th>
                    <th scope="col">Days to Maturity</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestmentItems.map((item) => {
                    const d2m = item.days2Maturity;
                    const d2mTone = d2m === null ? 'neutral' : d2m < 0 ? 'danger' : d2m <= 30 ? 'warn' : 'neutral';

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-primary-cell">
                            <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.investmentReference ?? item.id.slice(0, 8)}</strong>
                            <small>{formatShortDate(item.mobilisationDate)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="table-primary-cell">
                            <strong>{item.customerName}</strong>
                            <small style={{ fontFamily: 'monospace' }}>{item.customerId}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`pill pill-${item.customerType === 'new' ? 'good' : 'neutral'}`}>
                            {item.customerType === 'new' ? 'NTB' : 'Returning'}
                          </span>
                        </td>
                        <td><span className="table-value-strong">{formatCurrency(Number(item.investmentAmount))}</span></td>
                        <td>
                          {item.fundType === 'inflow'
                            ? <span className="table-value-strong">{formatCurrency(Number(item.investmentAmount))}</span>
                            : <span className="table-secondary-copy">—</span>}
                        </td>
                        <td>
                          {item.fundType === 'rollover'
                            ? <span className="table-value-strong">{formatCurrency(Number(item.investmentAmount))}</span>
                            : <span className="table-secondary-copy">—</span>}
                        </td>
                        <td><span className="table-secondary-copy">{item.relationshipManager ?? '—'}</span></td>
                        <td><span className="table-secondary-copy">{formatTenorLabel(item.tenorCategory)}</span></td>
                        <td>
                          {d2m === null
                            ? <span className="table-secondary-copy">—</span>
                            : <span className={`pill pill-${d2mTone}`}>{d2m < 0 ? `${Math.abs(d2m)}d overdue` : `${d2m}d`}</span>}
                        </td>
                        <td>
                          <button className="primary-cta-button" type="button" onClick={() => setInvestmentDrawer(item)}>
                            View Details
                            <Icon name="launch" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginator
              page={investmentsPage}
              totalPages={investmentsOverview.data?.totalPages ?? 1}
              totalItems={investmentsOverview.data?.totalItems ?? 0}
              pageSize={50}
              isLoading={investmentsOverview.status === 'loading'}
              onPageChange={setInvestmentsPage}
            />
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
          <AgingBar items={summaryAgingItems} total={summaryAgingTotal} />
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
            <button
              className={`customer-filter-button${openFilterPanel === 'managers' ? ' customer-filter-button-active' : ''}`}
              type="button"
              onClick={() => setOpenFilterPanel(openFilterPanel === 'managers' ? null : 'managers')}
            >
              <Icon name="filter" />
              AUM filters
              {managerFilters.customerFocus !== '' && <span className="filter-badge">1</span>}
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => setNotice({ tone: 'warn', message: 'Manager export is not yet configured on this environment.' })}>
              Export
            </button>
          </div>
          {openFilterPanel === 'managers' && (
            <div className="filter-panel">
              <div className="filter-panel-section">
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Customer Focus</span>
                  <div className="filter-pills">
                    {([['', 'All managers'], ['new', 'NTB-dominant'], ['returning', 'Returning-dominant']] as [string, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`filter-pill${managerFilters.customerFocus === val ? ' filter-pill-active' : ''}`}
                        onClick={() => setManagerFilters({ customerFocus: val as ManagerFilterState['customerFocus'] })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {managerFilters.customerFocus !== '' && (
                <button type="button" className="filter-panel-clear" onClick={() => setManagerFilters(emptyManagerFilters)}>Clear filter</button>
              )}
            </div>
          )}
        </div>

        {wealthManagersOverview.status === 'loading' && filteredWealthManagers.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading Wealth manager performance</h4>
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
                  <th scope="col" className="table-rank-col">#</th>
                  <th scope="col">Manager</th>
                  <th scope="col">Customers</th>
                  <th scope="col">AUM</th>
                  <th scope="col">NTB Volume</th>
                  <th scope="col">Returning Volume</th>
                  <th scope="col">Inflow</th>
                  <th scope="col">Rollover</th>
                  <th scope="col">Top Customer</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWealthManagers.map((manager, index) => {
                  const topCustomer = manager.topCustomers[0];

                  return (
                    <tr key={manager.relationshipManager}>
                      <td className="table-rank-col">{index + 1}</td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{manager.relationshipManager}</strong>
                          <small>Act. Officer</small>
                        </div>
                      </td>
                      <td><span className="table-secondary-copy">{formatCount(manager.customerCount)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.totalAum)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.ntbMetrics.volume)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.returningCustomerMetrics.volume)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.inflowValue)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(manager.rolloverValue)}</span></td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{topCustomer?.customerName ?? '—'}</strong>
                          <small>{topCustomer ? formatCurrency(topCustomer.totalInvestment) : 'No record'}</small>
                        </div>
                      </td>
                      <td>
                        <button className="primary-cta-button" type="button" onClick={() => setManagerDrawer(manager)}>
                          View Details
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
            <button className="secondary-button customer-export-button" type="button" onClick={() => setNotice({ tone: 'warn', message: 'Customer portfolio export is not yet configured on this environment.' })}>
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
              Reset search &amp; filters
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="table-rank-col">#</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Class</th>
                  <th scope="col">Total Amount</th>
                  <th scope="col">Inflow</th>
                  <th scope="col">Rollover</th>
                  <th scope="col">Investments</th>
                  <th scope="col">Book Share</th>
                  <th scope="col">Last Date</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  return (
                    <tr key={customer.customerId}>
                      <td className="table-rank-col">{index + 1}</td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{customer.customerName}</strong>
                          <small style={{ fontFamily: 'monospace' }}>{customer.customerId}</small>
                        </div>
                      </td>
                      <td><span className={`pill pill-${customer.customerType === 'new' ? 'good' : 'neutral'}`}>{customer.customerType === 'new' ? 'NTB' : 'Returning'}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.totalInvestment)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.inflowValue)}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(customer.rolloverValue)}</span></td>
                      <td><span className="table-secondary-copy">{formatCount(customer.investmentCount)}</span></td>
                      <td><span className="table-secondary-copy">{formatPercent(customer.contributionPercentage)}</span></td>
                      <td><span className="table-secondary-copy">{formatShortDate(customer.lastInvestmentDate)}</span></td>
                      <td>
                        <button className="primary-cta-button" type="button" onClick={() => setCustomerDrawer(customer)}>
                          View Details
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

        <Paginator
          page={portfolioPage}
          totalPages={portfolioOverview.data?.totalPages ?? 1}
          totalItems={portfolioOverview.data?.totalItems ?? portfolioItems.length}
          pageSize={25}
          isLoading={portfolioOverview.status === 'loading'}
          onPageChange={setPortfolioPage}
        />
      </section>
    );
  }

  function renderCommissionsPage(): ReactNode {
    const allRecords = commissionsOverview.data?.items ?? [];
    const isLoading = commissionsOverview.status === 'loading';
    const totalItems = commissionsOverview.data?.totalItems ?? 0;
    const totalPages = commissionsOverview.data?.totalPages ?? 1;
    const hasActiveFilters = !!debouncedQuery || activeCommissionFilterCount > 0;

    function commNum(val: string | null | undefined): number {
      return parseFloat(String(val ?? '0').replace(/,/g, '')) || 0;
    }

    function rowTotalComm(r: CommissionRecordItem): number {
      return (
        commNum(r.wpFundsComm) + commNum(r.wpTeamComm) +
        commNum(r.wmNtbComm) + commNum(r.wmRetnComm) +
        commNum(r.tmNtbComm) + commNum(r.tmRetnComm) +
        commNum(r.omNtbComm) + commNum(r.omRetnComm) +
        commNum(r.ooNtbComm) + commNum(r.ooRetnComm)
      );
    }

    if (isLoading && allRecords.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Commissions loading">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading commission register</h4>
            <p>Fetching commission data from investment records.</p>
          </div>
        </section>
      );
    }

    if (commissionsOverview.status === 'error' && allRecords.length === 0) {
      return (
        <section className="wealth-manager-module panel" aria-label="Commissions error">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="alert" /></div>
            <h4>Commission register unavailable</h4>
            <p>{commissionsOverview.error ?? 'The commissions API did not return data.'}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="wealth-manager-module panel" aria-label="Commission register">
        <div className="customer-control-panel">
          <div className="customer-search-row">
            <div className="search-input-shell customer-search-shell">
              <Icon name="search" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by reference, customer, or manager"
              />
            </div>
            <button
              className={`customer-filter-button${openFilterPanel === 'commissions' ? ' customer-filter-button-active' : ''}`}
              type="button"
              onClick={() => setOpenFilterPanel(openFilterPanel === 'commissions' ? null : 'commissions')}
            >
              <Icon name="filter" />
              Comm. filters
              {activeCommissionFilterCount > 0 && <span className="filter-badge">{activeCommissionFilterCount}</span>}
            </button>
            <button className="secondary-button customer-export-button" type="button" onClick={() => setNotice({ tone: 'warn', message: 'Commission export is not yet configured on this environment.' })}>
              Export
            </button>
          </div>
          {openFilterPanel === 'commissions' && (
            <div className="filter-panel">
              <div className="filter-panel-section">
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Customer Class</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['new', 'NTB'], ['returning', 'Returning']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${commissionFilters.customerType === val ? ' filter-pill-active' : ''}`} onClick={() => updateCommissionFilter('customerType', val as CommissionFilterState['customerType'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Fund Type</span>
                  <div className="filter-pills">
                    {([['', 'All'], ['inflow', 'Inflow'], ['rollover', 'Rollover']] as [string, string][]).map(([val, label]) => (
                      <button key={val} type="button" className={`filter-pill${commissionFilters.fundType === val ? ' filter-pill-active' : ''}`} onClick={() => updateCommissionFilter('fundType', val as CommissionFilterState['fundType'])}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-panel-group">
                  <span className="filter-panel-label">Date Range</span>
                  <div className="filter-date-inputs">
                    <input type="date" value={commissionFilters.from} onChange={(e) => updateCommissionFilter('from', e.target.value)} />
                    <span>–</span>
                    <input type="date" value={commissionFilters.to} onChange={(e) => updateCommissionFilter('to', e.target.value)} />
                  </div>
                </div>
              </div>
              {activeCommissionFilterCount > 0 && (
                <button type="button" className="filter-panel-clear" onClick={() => { setCommissionFilters(emptyCommissionFilters); setCommissionsPage(1); }}>Clear all filters</button>
              )}
            </div>
          )}
        </div>

        {allRecords.length === 0 && !hasActiveFilters ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="database" /></div>
            <h4>No commission records</h4>
            <p>No investment records have been imported yet.</p>
          </div>
        ) : allRecords.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="search" /></div>
            <h4>No records match those filters</h4>
            <p>Try adjusting the search query, customer class, fund type, or date range.</p>
            <button className="secondary-button" type="button" onClick={() => { setSearchQuery(''); setCommissionFilters(emptyCommissionFilters); setCommissionsPage(1); }}>Reset search &amp; filters</button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Class</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Inflow</th>
                  <th scope="col">Rollover</th>
                  <th scope="col">Act. Officer</th>
                  <th scope="col" title="Wealth Point Funds Commission">WP Funds</th>
                  <th scope="col">Total Commission</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {allRecords.map((record) => {
                  const totalComm = rowTotalComm(record);
                  const wpFunds = commNum(record.wpFundsComm);
                  return (
                    <tr key={record.id}>
                      <td>
                        <div className="table-primary-cell">
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{record.investmentReference ?? '—'}</strong>
                          <small>{formatShortDate(record.mobilisationDate)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{record.customerName}</strong>
                          <small style={{ fontFamily: 'monospace' }}>{record.customerId}</small>
                        </div>
                      </td>
                      <td><span className={`pill pill-${record.customerType === 'new' ? 'good' : 'neutral'}`}>{record.customerType === 'new' ? 'NTB' : 'Returning'}</span></td>
                      <td><span className="table-value-strong">{formatCurrency(parseFloat(record.investmentAmount))}</span></td>
                      <td>
                        {record.fundType === 'inflow'
                          ? <span className="table-value-strong">{formatCurrency(parseFloat(record.investmentAmount))}</span>
                          : <span className="table-secondary-copy">—</span>}
                      </td>
                      <td>
                        {record.fundType === 'rollover'
                          ? <span className="table-value-strong">{formatCurrency(parseFloat(record.investmentAmount))}</span>
                          : <span className="table-secondary-copy">—</span>}
                      </td>
                      <td><span className="table-secondary-copy">{record.relationshipManager ?? '—'}</span></td>
                      <td>
                        {wpFunds > 0
                          ? <span className="table-value-strong">{formatCurrency(wpFunds)}</span>
                          : <span className="table-secondary-copy">—</span>}
                      </td>
                      <td>
                        {totalComm > 0
                          ? <span className="table-value-strong">{formatCurrency(totalComm)}</span>
                          : <span className="table-secondary-copy">—</span>}
                      </td>
                      <td>
                        <button className="primary-cta-button" type="button" onClick={() => setInvestmentDrawer(record as unknown as InvestmentRecordItem)}>
                          View Details
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

        <Paginator
          page={commissionsOverview.data?.page ?? commissionsPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={50}
          isLoading={isLoading}
          onPageChange={setCommissionsPage}
        />
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
    const investingReportSeries = trendsData?.monthly ?? [];
    const investingBreakdownByPeriod = new Map(
      (trendsData?.trendBreakdown.monthly ?? []).map((point) => [point.period, point]),
    );
    const investingReportRows = investingReportSeries.map((point) => {
      const breakdown = investingBreakdownByPeriod.get(point.period);
      const date = new Date(`${point.period}-01T00:00:00`);

      return {
        period: point.period,
        label: Number.isNaN(date.getTime())
          ? point.period
          : date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        investmentCount: point.investmentCount,
        totalInvestment: point.totalInvestment,
        newCustomerCount: breakdown?.newCustomerCount ?? 0,
        newCustomerInvestment: breakdown?.newCustomerInvestment ?? 0,
        returningCustomerCount: breakdown?.returningCustomerCount ?? 0,
        returningCustomerInvestment: breakdown?.returningCustomerInvestment ?? 0,
      };
    });
    const reportGridStroke = 'rgba(20, 41, 37, 0.06)';
    const investingMetricCards = [
      { label: 'AUM Investments', value: formatCount(summaryData?.investmentCount), helper: 'Confirmed valid records' },
      { label: 'AUM Volume', value: formatCurrency(summaryData?.totalInvestment), helper: 'Mobilised investment volume' },
      { label: 'NTB Customers', value: formatCount(summaryData?.newCustomers.customerCount), helper: 'New-to-bank customers' },
      { label: 'NTB Volume', value: formatCurrency(summaryData?.newCustomers.investmentValue), helper: 'New-to-bank volume' },
      { label: 'Returning Customers', value: formatCount(summaryData?.returningCustomers.customerCount), helper: 'Returning customer count' },
      { label: 'Returning Volume', value: formatCurrency(summaryData?.returningCustomers.investmentValue), helper: 'Returning customer volume' },
    ];

    return (
      <div className="trends-charts-page" aria-label="Reports overview dashboard">
        <section className="panel date-filter-bar">
          <div className="date-filter-presets">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={reportsPreset === p.id ? 'range-option range-option-active' : 'range-option'}
                onClick={() => {
                  setReportsPreset(p.id);
                  if (p.id !== 'custom') { const r = presetToDateRange(p.id); setReportsFrom(r.from); setReportsTo(r.to); }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="date-filter-inputs">
            <label className="date-filter-field">
              <span className="trends-period-label">From</span>
              <input type="date" className="date-range-input" value={reportsFrom} max={reportsTo || undefined}
                onChange={(e) => { setReportsFrom(e.target.value); setReportsPreset('custom'); }} />
            </label>
            <label className="date-filter-field">
              <span className="trends-period-label">To</span>
              <input type="date" className="date-range-input" value={reportsTo} min={reportsFrom || undefined}
                onChange={(e) => { setReportsTo(e.target.value); setReportsPreset('custom'); }} />
            </label>
            {(reportsFrom || reportsTo) && (
              <button type="button" className="secondary-button" onClick={() => { setReportsFrom(''); setReportsTo(''); setReportsPreset('all'); }}>Clear</button>
            )}
            <div className="date-filter-divider" />
            <button className="secondary-button" type="button" onClick={reloadReportsOverview}>Refresh</button>
            <button className="secondary-button" type="button" onClick={() => {
              const count = queuedReports.length;
              setNotice({ tone: count > 0 ? 'warn' : 'good', message: count > 0 ? `${count} report${count > 1 ? 's' : ''} are currently being processed.` : 'No reports are currently queued.' });
            }}>
              Queue
            </button>
            <button className="primary-button" type="button" onClick={() => setNotice({ tone: 'warn', message: 'Report export creation is not yet available in this environment.' })}>
              {currentDefinition.actionLabel}
            </button>
          </div>
          <div className="date-filter-status">
            {reportsOverview.status === 'loading'
              ? <span className="pill pill-neutral">Refreshing…</span>
              : reportsOverview.status === 'error'
                ? <span className="pill pill-warn">Error</span>
                : (reportsFrom || reportsTo)
                  ? <span className="pill pill-good">{reportCount} filtered</span>
                  : <span className="pill pill-neutral">{reportCount} total</span>}
          </div>
        </section>

        <section className="panel reports-table-panel" aria-label="Investing report">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Investing report</p>
              <h3>Portfolio mobilisation report</h3>
            </div>
            <span className="table-count">
              {(reportsFrom || reportsTo) ? `${reportsFrom || 'Start'} to ${reportsTo || 'Latest'}` : 'All time'}
            </span>
          </div>

          {summaryOverview.status === 'error' || trendsOverview.status === 'error' ? (
            <div className="feedback-banner feedback-warn">
              Live investing report data is unavailable: {summaryOverview.error ?? trendsOverview.error ?? 'Analytics request failed.'}
            </div>
          ) : null}

          <section className="metric-grid" aria-label="Investing report metrics" style={{ marginBottom: 0 }}>
            {investingMetricCards.map((metric) => (
              <article key={metric.label} className="metric-card metric-card-neutral">
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <span className="metric-delta metric-delta-neutral">{metric.helper}</span>
              </article>
            ))}
          </section>

          <div className="trends-chart-grid" style={{ marginTop: 14 }}>
            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div><p className="eyebrow">AUM</p><h3>Mobilisation by month</h3></div>
                <strong className="trends-kpi">{formatCurrency(summaryData?.totalInvestment)}</strong>
              </div>
              <div className="trends-chart-canvas">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={investingReportRows}>
                    <defs>
                      <linearGradient id="reportInvestmentFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartToneColors.brand} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={chartToneColors.brand} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={reportGridStroke} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={60} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Area type="monotone" dataKey="totalInvestment" name="AUM volume" stroke={chartToneColors.brand} fill="url(#reportInvestmentFill)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div><p className="eyebrow">Reconciliation</p><h3>Analytics source</h3></div>
              </div>
              <div className="summary-kpi-list">
                <div className="summary-kpi-row"><span className="trends-period-label">Record scope</span><strong>Confirmed valid investments</strong></div>
                <div className="summary-kpi-row"><span className="trends-period-label">Date field</span><strong>Mobilisation date</strong></div>
                <div className="summary-kpi-row"><span className="trends-period-label">Summary status</span><strong>{summaryOverview.status}</strong></div>
                <div className="summary-kpi-row"><span className="trends-period-label">Trend status</span><strong>{trendsOverview.status}</strong></div>
              </div>
            </article>
          </div>

          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">AUM Count</th>
                  <th scope="col">AUM Volume</th>
                  <th scope="col">NTB Count</th>
                  <th scope="col">NTB Volume</th>
                  <th scope="col">Returning Count</th>
                  <th scope="col">Returning Volume</th>
                </tr>
              </thead>
              <tbody>
                {investingReportRows.length > 0 ? investingReportRows.map((row) => (
                  <tr key={row.period}>
                    <td><span className="table-value-strong">{row.label}</span></td>
                    <td><span className="table-secondary-copy">{formatCount(row.investmentCount)}</span></td>
                    <td><span className="table-value-strong">{formatCurrency(row.totalInvestment)}</span></td>
                    <td><span className="table-secondary-copy">{formatCount(row.newCustomerCount)}</span></td>
                    <td><span className="table-secondary-copy">{formatCurrency(row.newCustomerInvestment)}</span></td>
                    <td><span className="table-secondary-copy">{formatCount(row.returningCustomerCount)}</span></td>
                    <td><span className="table-secondary-copy">{formatCurrency(row.returningCustomerInvestment)}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}><span className="table-secondary-copy">No confirmed valid investment records in this reporting window.</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {reportsOverview.status === 'error' && reportsOverview.items.length === 0 ? (
          <div className="feedback-banner feedback-warn">Reports data is unavailable: {reportsOverview.error}</div>
        ) : null}

        <section className="metric-grid" aria-label="Report metrics" style={{ marginBottom: 0 }}>
          {reportMetricCards.map((metric) => (
            <article key={metric.label} className={`metric-card metric-card-${metric.tone}`}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span className={`metric-delta metric-delta-${metric.tone}`}>{metric.delta}</span>
            </article>
          ))}
        </section>

        <section className="panel reports-table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Export runs</p>
              <h3>Report activity in range</h3>
            </div>
            <div className="reports-table-actions">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Completed', value: completedReports.length, tone: 'good' as const },
                  { label: 'Queued', value: queuedReports.length, tone: 'warn' as const },
                  { label: 'Failed', value: failedReports.length, tone: failedReports.length > 0 ? 'warn' as const : 'neutral' as const },
                ].map((s) => (
                  <div key={s.label} className="summary-kpi-row" style={{ gap: 6 }}>
                    <span className="trends-period-label">{s.label}</span>
                    <strong className={`metric-delta-${s.tone}`}>{s.value}</strong>
                  </div>
                ))}
              </div>
              <div className="search-input-shell reports-table-search">
                <Icon name="search" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by type, format, status…"
                />
              </div>
              <button className="secondary-button" type="button" onClick={() => {
                const latest = completedReports.find((r) => r.fileUrl);
                if (latest?.fileUrl) {
                  window.open(latest.fileUrl, '_blank', 'noreferrer');
                } else {
                  setNotice({ tone: 'warn', message: 'No completed report with a download link is available.' });
                }
              }}>
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
          ) : reportItemsInRange.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <div className="empty-state-icon"><Icon name="search" /></div>
              <h4>{emptyStateCopyByView[currentView].title}</h4>
              <p>{emptyStateCopyByView[currentView].description}</p>
              <button className="secondary-button" type="button" onClick={() => setSearchQuery('')}>Reset search</button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Format</th>
                    <th scope="col">Requested by</th>
                    <th scope="col">Created</th>
                    <th scope="col">Completed</th>
                    <th scope="col">Size</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItemsInRange.filter((item) => {
                    const q = searchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return `${formatReportType(item.reportType)} ${item.outputFormat} ${item.status} ${item.requestedBy}`.toLowerCase().includes(q);
                  }).map((item) => {
                    const tone = item.status === 'completed' ? 'good' : item.status === 'failed' ? 'warn' : 'neutral';
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="table-value-strong">{formatReportType(item.reportType)}</span>
                        </td>
                        <td>
                          <span className="pill pill-neutral">{item.outputFormat.toUpperCase()}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.requestedBy}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{formatReportTime(item.createdAt)}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.completedAt ? formatReportTime(item.completedAt) : '—'}</span>
                        </td>
                        <td>
                          <span className="table-secondary-copy">{item.fileSizeBytes ? `${Math.round(item.fileSizeBytes / 1024)} KB` : '—'}</span>
                        </td>
                        <td>
                          <div>
                            <span className={`pill pill-${tone}`}>{item.status}</span>
                            {item.errorMessage ? <small style={{ display: 'block', marginTop: 3, fontSize: '0.72rem', color: 'var(--muted)' }}>{item.errorMessage}</small> : null}
                          </div>
                        </td>
                        <td>
                          <button className="table-action" type="button" onClick={() => setReportDrawer(item)}>
                            View<Icon name="launch" />
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
      </div>
    );
  }

  function renderSummaryPage(): ReactNode {
    if (summaryOverview.status === 'loading' && !summaryData) {
      return (
        <section className="panel table-panel" aria-label="Summary loading">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="refresh" /></div>
            <h4>Loading overview</h4>
            <p>Fetching the current portfolio summary from the analytics engine.</p>
          </div>
        </section>
      );
    }
    if (summaryOverview.status === 'error' && !summaryData) {
      return (
        <section className="panel table-panel" aria-label="Summary error">
          <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state-icon"><Icon name="alert" /></div>
            <h4>Overview unavailable</h4>
            <p>{summaryOverview.error ?? 'Unable to load portfolio summary.'}</p>
          </div>
        </section>
      );
    }

    const CHART_H = 210;
    const gridStroke = 'rgba(20, 41, 37, 0.06)';

    function summaryChartGrad(id: string, color: string): ReactNode {
      return (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.22} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
      );
    }

    const aumTrendSeries = (trendsData?.monthly ?? []).map((p) => {
      const d = new Date(`${p.period}-01T00:00:00`);
      return {
        label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        volume: p.totalInvestment,
      };
    });

    const customerMixData = [
      { label: 'New to Bank', value: summaryData?.newCustomers.customerCount ?? 0, color: chartToneColors.good },
      { label: 'Returning', value: summaryData?.returningCustomers.customerCount ?? 0, color: chartToneColors.brand },
    ].filter((d) => d.value > 0);

    const fundMixData = [
      { label: 'Inflow', value: summaryData?.inflowFunds.investmentValue ?? 0, color: chartToneColors.brand },
      { label: 'Rollover', value: summaryData?.rolloverFunds.investmentValue ?? 0, color: chartToneColors.warn },
    ];

    const tenorData = (summaryData?.tenorBreakdown ?? [])
      .slice()
      .sort((a, b) => b.investmentValue - a.investmentValue)
      .map((t) => ({ label: t.label, value: t.investmentValue }));

    const topTenor = tenorData[0]?.label ?? '--';

    return (
      <div className="trends-charts-page">
        <section className="panel date-filter-bar">
          <div className="date-filter-presets">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={summaryPreset === p.id ? 'range-option range-option-active' : 'range-option'}
                onClick={() => {
                  setSummaryPreset(p.id);
                  if (p.id !== 'custom') {
                    const r = presetToDateRange(p.id);
                    setSummaryFrom(r.from);
                    setSummaryTo(r.to);
                    setSummaryRefreshKey((k) => k + 1);
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="date-filter-inputs">
            <label className="date-filter-field">
              <span className="trends-period-label">From</span>
              <input
                type="date"
                className="date-range-input"
                value={summaryFrom}
                max={summaryTo || undefined}
                onChange={(e) => { setSummaryFrom(e.target.value); setSummaryPreset('custom'); setSummaryRefreshKey((k) => k + 1); }}
              />
            </label>
            <label className="date-filter-field">
              <span className="trends-period-label">To</span>
              <input
                type="date"
                className="date-range-input"
                value={summaryTo}
                min={summaryFrom || undefined}
                onChange={(e) => { setSummaryTo(e.target.value); setSummaryPreset('custom'); setSummaryRefreshKey((k) => k + 1); }}
              />
            </label>
            {(summaryFrom || summaryTo) && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setSummaryFrom(''); setSummaryTo(''); setSummaryPreset('all'); setSummaryRefreshKey((k) => k + 1); }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="date-filter-status">
            {summaryOverview.status === 'loading'
              ? <span className="pill pill-neutral">Refreshing…</span>
              : (summaryFrom || summaryTo)
                ? <span className="pill pill-good">Filtered</span>
                : <span className="pill pill-neutral">All time</span>}
          </div>
        </section>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">AUM</p><h3>Mobilisation over time</h3></div>
              <strong className="trends-kpi">{formatCurrency(summaryData?.totalInvestment)}</strong>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={CHART_H}>
                <AreaChart data={aumTrendSeries}>
                  {summaryChartGrad('sumAUMFill', chartToneColors.brand)}
                  <CartesianGrid vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={60} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="volume" name="Volume" stroke={chartToneColors.brand} fill="url(#sumAUMFill)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Customers</p><h3>NTB vs returning</h3></div>
              <strong className="trends-kpi">{formatCount(summaryData?.uniqueCustomers)}</strong>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={CHART_H}>
                <PieChart>
                  <Pie data={customerMixData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={90} paddingAngle={3}>
                    {customerMixData.map((item) => <Cell key={item.label} fill={item.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="summary-legend">
              {customerMixData.map((item) => (
                <article key={item.label} className="summary-legend-item">
                  <span className="summary-legend-dot" style={{ backgroundColor: item.color }} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{formatCount(item.value)} customers</small>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Fund Mix</p><h3>Inflow vs rollover</h3></div>
              <strong className="trends-kpi">{summaryData ? `${summaryData.fundTypeSplit.inflowShare.toFixed(0)}% inflow` : '--'}</strong>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={fundMixData}>
                  <CartesianGrid vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={60} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {fundMixData.map((item) => <Cell key={item.label} fill={item.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Tenor</p><h3>Exposure breakdown</h3></div>
              <strong className="trends-kpi">{topTenor}</strong>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={tenorData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} fill={chartToneColors.good} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Metrics</p><h3>Key averages</h3></div>
            </div>
            <div className="summary-kpi-list">
              <div className="summary-kpi-row">
                <span className="trends-period-label">Avg. ticket (record)</span>
                <strong>{formatCurrency(summaryData?.averageInvestmentPerRecord)}</strong>
              </div>
              <div className="summary-kpi-row">
                <span className="trends-period-label">Avg. ticket (customer)</span>
                <strong>{formatCurrency(summaryData?.averageInvestmentPerCustomer)}</strong>
              </div>
              <div className="summary-kpi-row">
                <span className="trends-period-label">Investment count</span>
                <strong>{formatCount(summaryData?.investmentCount)}</strong>
              </div>
              {summaryData?.averageCostOfFunds != null && (
                <div className="summary-kpi-row">
                  <span className="trends-period-label">Avg. cost of funds</span>
                  <strong>{formatPercent(summaryData.averageCostOfFunds)}</strong>
                </div>
              )}
            </div>
          </article>

          {summaryData?.highestContribution && (
            <article className="panel trends-chart-panel">
              <div className="panel-header compact">
                <div><p className="eyebrow">Highlight</p><h3>Top contributor</h3></div>
              </div>
              <div className="summary-kpi-list">
                <div className="summary-kpi-row">
                  <span className="trends-period-label">Customer</span>
                  <strong>{summaryData.highestContribution.customerName}</strong>
                </div>
                <div className="summary-kpi-row">
                  <span className="trends-period-label">Amount</span>
                  <strong>{formatCurrency(summaryData.highestContribution.investmentAmount)}</strong>
                </div>
                <div className="summary-kpi-row">
                  <span className="trends-period-label">Date</span>
                  <strong>{formatShortDate(summaryData.highestContribution.mobilisationDate)}</strong>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
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
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        </>
      );
    }

    const series = trendsData?.[trendsPeriod] ?? [];
    const breakdown = trendsData?.trendBreakdown[trendsPeriod] ?? [];

    const aumChartData = series.map((p) => ({
      label: formatTrendPeriod(p.period),
      volume: p.totalInvestment,
      count: p.investmentCount,
    }));
    const ntbChartData = breakdown.map((p) => ({
      label: formatTrendPeriod(p.period),
      volume: p.newCustomerInvestment,
      count: p.newCustomerCount,
    }));
    const retChartData = breakdown.map((p) => ({
      label: formatTrendPeriod(p.period),
      volume: p.returningCustomerInvestment,
      count: p.returningCustomerCount,
    }));

    const totalAUMVolume = series.reduce((s, p) => s + p.totalInvestment, 0);
    const totalAUMCount = series.reduce((s, p) => s + p.investmentCount, 0);
    const totalNTBVolume = breakdown.reduce((s, p) => s + p.newCustomerInvestment, 0);
    const peakNTBCount = breakdown.length > 0 ? Math.max(...breakdown.map((p) => p.newCustomerCount)) : 0;
    const totalReturnVolume = breakdown.reduce((s, p) => s + p.returningCustomerInvestment, 0);
    const peakReturnCount = breakdown.length > 0 ? Math.max(...breakdown.map((p) => p.returningCustomerCount)) : 0;

    return (
      <div className="trends-charts-page">
        <section className="panel date-filter-bar">
          <div className="date-filter-presets">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={trendsPreset === p.id ? 'range-option range-option-active' : 'range-option'}
                onClick={() => {
                  setTrendsPreset(p.id);
                  if (p.id !== 'custom') {
                    const r = presetToDateRange(p.id);
                    setTrendsFrom(r.from);
                    setTrendsTo(r.to);
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="date-filter-inputs">
            <label className="date-filter-field">
              <span className="trends-period-label">From</span>
              <input
                type="date"
                className="date-range-input"
                aria-label="From date"
                value={trendsFrom}
                max={trendsTo || undefined}
                onChange={(e) => { setTrendsFrom(e.target.value); setTrendsPreset('custom'); }}
              />
            </label>
            <label className="date-filter-field">
              <span className="trends-period-label">To</span>
              <input
                type="date"
                className="date-range-input"
                aria-label="To date"
                value={trendsTo}
                min={trendsFrom || undefined}
                onChange={(e) => { setTrendsTo(e.target.value); setTrendsPreset('custom'); }}
              />
            </label>
            {(trendsFrom || trendsTo) && (
              <button type="button" className="secondary-button" onClick={() => { setTrendsFrom(''); setTrendsTo(''); setTrendsPreset('all'); }}>
                Clear
              </button>
            )}
            <div className="date-filter-divider" />
            <div className="date-filter-field">
              <span className="trends-period-label">Resolution</span>
              <div className="range-toggle" role="tablist" aria-label="Chart resolution">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button key={p} type="button" className={p === trendsPeriod ? 'range-option range-option-active' : 'range-option'} onClick={() => setTrendsPeriod(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="date-filter-status">
            {trendsOverview.status === 'loading' ? (
              <span className="pill pill-neutral">Refreshing…</span>
            ) : (trendsFrom || trendsTo) ? (
              <span className="pill pill-good">Filtered</span>
            ) : (
              <span className="pill pill-neutral">All time</span>
            )}
          </div>
        </section>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">AUM</p><h3>Investment volume</h3></div>
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
              <div><p className="eyebrow">AUM</p><h3>Investment count</h3></div>
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

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">NTB</p><h3>New customer volume</h3></div>
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
              <div><p className="eyebrow">NTB</p><h3>New customer count</h3></div>
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

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Returning</p><h3>Returning customer volume</h3></div>
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
              <div><p className="eyebrow">Returning</p><h3>Returning customer count</h3></div>
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
    );
  }

  function renderUserDrawer(): ReactNode {
    if (userDrawer.mode === null) return null;

    const isInvite = userDrawer.mode === 'invite';
    const editingUser = isInvite ? null : userItems.find((u) => u.id === userDrawer.userId) ?? null;
    const availableRoles = rolesData.data?.items ?? [];

    function closeDrawer() {
      setUserDrawer({ mode: null });
      setInviteForm({ name: '', email: '', roleCode: 'analyst' });
    }

    async function handleInviteSubmit() {
      if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
        setNotice({ message: 'Name and email are required', tone: 'warn' }); return;
      }
      try {
        await apiMutate('POST', 'users', { name: inviteForm.name.trim(), email: inviteForm.email.trim(), roleCode: inviteForm.roleCode });
        setNotice({ message: `Invite sent to ${inviteForm.email} — they'll receive a set-password email`, tone: 'info' });
        setUsersOverview({ status: 'idle', data: null, error: null });
        closeDrawer();
      } catch (err: unknown) {
        setNotice({ message: err instanceof Error ? err.message : 'Failed to invite user', tone: 'warn' });
      }
    }

    async function handleEditSubmit() {
      if (!editingUser) return;
      try {
        await apiMutate('PATCH', `users/${editingUser.id}`, { name: editForm.name || undefined, email: editForm.email || undefined, roleCode: editForm.roleCode || undefined });
        if (editForm.status && editForm.status !== editingUser.status) {
          await apiMutate('PATCH', `users/${editingUser.id}/status`, { status: editForm.status });
        }
        setNotice({ message: 'User updated successfully', tone: 'info' });
        setUsersOverview({ status: 'idle', data: null, error: null });
        closeDrawer();
      } catch (err: unknown) {
        setNotice({ message: err instanceof Error ? err.message : 'Failed to update user', tone: 'warn' });
      }
    }

    return (
      <>
        <div className="drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={isInvite ? 'Invite user' : 'Edit user'}>
          <div className="drawer-header">
            <h3>{isInvite ? 'Invite User' : 'Edit User'}</h3>
            <button className="icon-button" type="button" onClick={closeDrawer} aria-label="Close drawer">
              <Icon name="x" />
            </button>
          </div>

          <div className="drawer-body">
            {isInvite ? (
              <div className="form-grid">
                <label className="field-card">
                  <span className="field-label">Full Name</span>
                  <input type="text" value={inviteForm.name} onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" autoComplete="name" />
                </label>
                <label className="field-card">
                  <span className="field-label">Email</span>
                  <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" autoComplete="email" />
                </label>
                <label className="field-card field-card-wide">
                  <span className="field-label">Role</span>
                  <select value={inviteForm.roleCode} onChange={(e) => setInviteForm((p) => ({ ...p, roleCode: e.target.value }))}>
                    {availableRoles.length > 0
                      ? availableRoles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)
                      : <><option value="admin">Administrator</option><option value="analyst">Analyst</option><option value="uploader">Uploader</option></>
                    }
                  </select>
                </label>
                <p className="eyebrow" style={{ gridColumn: '1/-1', marginTop: 4 }}>
                  A set-password email will be sent to the invitee automatically.
                </p>
              </div>
            ) : editingUser ? (
              <div className="form-grid">
                <label className="field-card">
                  <span className="field-label">Full Name</span>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label className="field-card">
                  <span className="field-label">Email</span>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="field-card">
                  <span className="field-label">Role</span>
                  <select value={editForm.roleCode} onChange={(e) => setEditForm((p) => ({ ...p, roleCode: e.target.value }))}>
                    {availableRoles.length > 0
                      ? availableRoles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)
                      : <><option value="admin">Administrator</option><option value="analyst">Analyst</option><option value="uploader">Uploader</option></>
                    }
                  </select>
                </label>
                <label className="field-card">
                  <span className="field-label">Status</span>
                  <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <div className="field-card field-card-wide" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <span className="field-label" style={{ marginBottom: 4, display: 'block' }}>Admin password reset</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openDialog({ title: `Reset ${editingUser.name}'s password`, description: 'Send a password reset link to this user, or set a temporary password for them.', confirmLabel: 'Send reset link', tone: 'default' })}
                  >
                    Reset password
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state"><h4>User not found</h4></div>
            )}
          </div>

          <div className="drawer-footer">
            <button className="secondary-button" type="button" onClick={closeDrawer}>Cancel</button>
            <button className="primary-button" type="button" onClick={isInvite ? handleInviteSubmit : handleEditSubmit}>
              {isInvite ? 'Invite user' : 'Save changes'}
            </button>
          </div>
        </aside>
      </>
    );
  }

  function renderUsersPage(): ReactNode {
    const matrixRoles = roleMatrix.data?.roles ?? [];
    const matrixPermissions = roleMatrix.data?.permissions ?? [];

    // Group permissions by category prefix and map to human-readable section names
    const GROUP_LABELS: Record<string, string> = {
      auth:         'Authentication',
      users:        'Team Management',
      uploads:      'Data Uploads',
      dashboard:    'Dashboards & Analytics',
      reports:      'Reports & Exports',
      integrations: 'Data Integrations',
      audit:        'Audit & Compliance',
      settings:     'System Settings',
      jobs:         'Background Jobs',
    };

    const permGroups = matrixPermissions.reduce<Record<string, PermissionItem[]>>((acc, p) => {
      const group = p.code.split('.')[0] ?? 'other';
      acc[group] = [...(acc[group] ?? []), p];
      return acc;
    }, {});

    async function handleTogglePermission(roleId: string, permCode: string, currentCodes: string[]) {
      const newCodes = currentCodes.includes(permCode)
        ? currentCodes.filter((c) => c !== permCode)
        : [...currentCodes, permCode];
      setSavingRoleId(roleId);
      setSavedRoleId(null);
      try {
        await apiMutate('PUT', `roles/${roleId}/permissions`, { permissionCodes: newCodes });
        setRoleMatrix((prev) => {
          if (!prev.data) return prev;
          return {
            ...prev,
            data: { ...prev.data, roles: prev.data.roles.map((r) => r.id === roleId ? { ...r, permissionCodes: newCodes } : r) },
          };
        });
        setSavedRoleId(roleId);
        window.setTimeout(() => setSavedRoleId((cur) => cur === roleId ? null : cur), 2000);
      } catch (err: unknown) {
        setNotice({ message: err instanceof Error ? err.message : 'Failed to update permissions', tone: 'warn' });
      } finally {
        setSavingRoleId((cur) => cur === roleId ? null : cur);
      }
    }

    async function handleCreateRole() {
      if (!newRoleForm.name.trim() || !newRoleForm.code.trim()) {
        setNotice({ message: 'Role name and code are required', tone: 'warn' }); return;
      }
      try {
        await apiMutate('POST', 'roles', { name: newRoleForm.name.trim(), code: newRoleForm.code.trim(), description: newRoleForm.description.trim() || undefined });
        setNotice({ message: `Role "${newRoleForm.name}" created`, tone: 'info' });
        setNewRoleForm({ name: '', code: '', description: '' });
        setShowCreateRoleDrawer(false);
        setRoleMatrix({ status: 'idle', data: null, error: null });
      } catch (err: unknown) {
        setNotice({ message: err instanceof Error ? err.message : 'Failed to create role', tone: 'warn' });
      }
    }

    async function handleDeleteRole(roleId: string, roleName: string) {
      openDialog({
        title: `Delete "${roleName}"`,
        description: `This role will be permanently removed. All users must be reassigned first.`,
        confirmLabel: 'Delete role',
        tone: 'danger',
        onConfirm: async () => {
          await apiMutate('DELETE', `roles/${roleId}`);
          setNotice({ tone: 'warn', message: `Role "${roleName}" has been deleted.` });
          setRoleMatrix({ status: 'idle', data: null, error: null });
        },
      });
    }

    return (
      <>
        {renderUserDrawer()}

        {showCreateRoleDrawer ? (
          <>
            <div className="drawer-scrim" onClick={() => { setShowCreateRoleDrawer(false); setNewRoleForm({ name: '', code: '', description: '' }); }} aria-hidden="true" />
            <aside className="drawer" role="dialog" aria-modal="true" aria-label="Create custom role">
              <div className="drawer-header">
                <h3>Create Custom Role</h3>
                <button className="icon-button" type="button" onClick={() => { setShowCreateRoleDrawer(false); setNewRoleForm({ name: '', code: '', description: '' }); }} aria-label="Close">
                  <Icon name="x" />
                </button>
              </div>
              <div className="drawer-body">
                <div className="form-grid">
                  <label className="field-card field-card-wide">
                    <span className="field-label">Role Name</span>
                    <input type="text" value={newRoleForm.name} onChange={(e) => setNewRoleForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Compliance Officer" autoFocus />
                  </label>
                  <label className="field-card field-card-wide">
                    <span className="field-label">Code (lowercase, underscores)</span>
                    <span className="field-help">Used internally — cannot be changed after creation</span>
                    <input type="text" value={newRoleForm.code} onChange={(e) => setNewRoleForm((p) => ({ ...p, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') }))} placeholder="e.g. compliance_officer" />
                  </label>
                  <label className="field-card field-card-wide">
                    <span className="field-label">Description <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></span>
                    <input type="text" value={newRoleForm.description} onChange={(e) => setNewRoleForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description of this role's purpose" />
                  </label>
                </div>
              </div>
              <div className="drawer-footer">
                <button className="secondary-button" type="button" onClick={() => { setShowCreateRoleDrawer(false); setNewRoleForm({ name: '', code: '', description: '' }); }}>Cancel</button>
                <button className="primary-button" type="button" onClick={handleCreateRole}>Create role</button>
              </div>
            </aside>
          </>
        ) : null}

        <div className="settings-page">
          <div className="settings-page-header">
            <h2>Team</h2>
            <p>Manage admin accounts, roles, and access permissions</p>
          </div>

          <div className="customer-tab-bar" role="tablist">
            <button role="tab" aria-selected={usersTab === 'admins'} className={usersTab === 'admins' ? 'customer-tab customer-tab-active' : 'customer-tab'} onClick={() => setUsersTab('admins')}>
              Admins
            </button>
            <button role="tab" aria-selected={usersTab === 'roles'} className={usersTab === 'roles' ? 'customer-tab customer-tab-active' : 'customer-tab'} onClick={() => setUsersTab('roles')}>
              Roles &amp; Permissions
            </button>
          </div>

          {usersTab === 'admins' ? (
            <section className="panel table-panel">
              <div className="panel-header">
                <div>
                  <h3>Administrators</h3>
                  <p className="eyebrow">{formatCount(userItems.length)} accounts</p>
                </div>
                {canManageTeam && (
                  <div className="panel-header-actions">
                    <button className="primary-button" type="button" onClick={() => setUserDrawer({ mode: 'invite' })}>
                      <Icon name="plus" /> Invite user
                    </button>
                  </div>
                )}
              </div>

              {usersOverview.status === 'loading' && userItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="refresh" /></div>
                  <h4>Loading team</h4>
                  <p>Fetching admin accounts from the API.</p>
                </div>
              ) : usersOverview.status === 'error' ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="alert" /></div>
                  <h4>Failed to load users</h4>
                  <p>{usersOverview.error}</p>
                </div>
              ) : userItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="users" /></div>
                  <h4>No users found</h4>
                  <p>Invite a user to get started.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Role</th>
                        <th scope="col">Status</th>
                        <th scope="col">Last login</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userItems.map((item) => {
                        // Anyone who hasn't logged in yet is "Pending", regardless of their stored status.
                        // This covers both: users created before the inactive-on-invite fix (still have
                        // status='active' in the DB) and newly invited users (status='inactive').
                        const isPending = !item.lastLoginAt;
                        const displayStatus = isPending ? 'Pending' : item.status;
                        const tone = item.status === 'active' && !isPending ? 'good' : item.status === 'suspended' ? 'warn' : 'neutral';
                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="table-primary-cell">
                                <strong>{item.name}</strong>
                              </div>
                            </td>
                            <td><span className="table-secondary-copy">{item.email}</span></td>
                            <td><span className="pill pill-neutral">{item.roleName ?? item.roleId}</span></td>
                            <td><span className={`pill pill-${tone}`}>{displayStatus}</span></td>
                            <td><span className="table-secondary-copy">{item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '—'}</span></td>
                            <td>
                              {canManageTeam ? (
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
                                  {!item.lastLoginAt && (
                                    <button
                                      className="table-action-icon"
                                      type="button"
                                      title="Resend invite"
                                      aria-label={`Resend invite to ${item.name}`}
                                      onClick={async () => {
                                        try {
                                          await apiMutate('POST', `users/${item.id}/resend-invite`, {});
                                          setNotice({ message: `Invite resent to ${item.email}`, tone: 'info' });
                                        } catch (err) {
                                          setNotice({ message: err instanceof Error ? err.message : 'Failed to resend invite', tone: 'warn' });
                                        }
                                      }}
                                    >
                                      <Icon name="mail" />
                                    </button>
                                  )}
                                  <button
                                    className="table-action-icon"
                                    type="button"
                                    title="Edit user"
                                    aria-label={`Edit ${item.name}`}
                                    onClick={() => {
                                      setEditForm({ name: item.name, email: item.email, roleCode: item.roleCode ?? '', status: item.status });
                                      setUserDrawer({ mode: 'edit', userId: item.id });
                                    }}
                                  >
                                    <Icon name="edit" />
                                  </button>
                                  {item.id !== session?.actorId && (
                                    <button
                                      className="table-action-icon table-action-icon-danger"
                                      type="button"
                                      title="Remove user"
                                      aria-label={`Remove ${item.name}`}
                                      onClick={() => openDialog({
                                        title: `Remove ${item.name}`,
                                        description: `Remove ${item.name} (${item.email}) from the platform? This cannot be undone.`,
                                        confirmLabel: 'Remove user',
                                        tone: 'danger',
                                        onConfirm: async () => {
                                          await apiMutate('DELETE', 'users', { ids: [item.id] });
                                          setNotice({ message: `${item.name} has been removed.`, tone: 'info' });
                                          setUsersOverview({ status: 'idle', data: null, error: null });
                                        },
                                      })}
                                    >
                                      <Icon name="x" />
                                    </button>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <>

              {/* Permission matrix */}
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Role Permissions</h3>
                    <p className="eyebrow">{formatCount(matrixRoles.length)} roles • {formatCount(matrixPermissions.length)} permissions</p>
                  </div>
                  {canManageTeam && (
                    <button className="primary-button" type="button" onClick={() => setShowCreateRoleDrawer(true)}>
                      Create role
                    </button>
                  )}
                </div>

                {roleMatrix.status === 'loading' ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="refresh" /></div>
                    <h4>Loading permissions</h4>
                    <p>Fetching role permissions matrix.</p>
                  </div>
                ) : roleMatrix.status === 'error' ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="alert" /></div>
                    <h4>Failed to load matrix</h4>
                    <p>{roleMatrix.error}</p>
                  </div>
                ) : matrixRoles.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Icon name="shield" /></div>
                    <h4>No roles found</h4>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table perm-matrix">
                      <thead>
                        <tr>
                          <th scope="col" className="perm-col-label">Permission</th>
                          {matrixRoles.map((role) => (
                            <th key={role.id} scope="col" className="perm-col-role">
                              <div className="perm-role-header">
                                <span>{role.name}</span>
                                {!role.isSystem && canManageTeam && (
                                  <button className="perm-delete-role" type="button" onClick={() => handleDeleteRole(role.id, role.name)} aria-label={`Delete ${role.name} role`} title="Delete role">
                                    <Icon name="x" />
                                  </button>
                                )}
                              </div>
                              {savingRoleId === role.id ? (
                                <span className="perm-save-indicator perm-saving">Saving…</span>
                              ) : savedRoleId === role.id ? (
                                <span className="perm-save-indicator perm-saved">Saved</span>
                              ) : null}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(permGroups).sort(([a], [b]) => a.localeCompare(b)).map(([group, perms]) => (
                          <>
                            <tr key={`group-${group}`} className="perm-group-row">
                              <td colSpan={matrixRoles.length + 1} className="perm-group-label">{GROUP_LABELS[group] ?? group}</td>
                            </tr>
                            {perms.map((perm) => (
                              <tr key={perm.id}>
                                <td className="perm-col-label">
                                  <span className="perm-desc">{perm.description ?? perm.code}</span>
                                  <code className="perm-code">{perm.code}</code>
                                </td>
                                {matrixRoles.map((role) => {
                                  const checked = role.permissionCodes.includes(perm.code);
                                  return (
                                    <td key={role.id} className="perm-col-check">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={savingRoleId === role.id || !canManageTeam}
                                        onChange={() => canManageTeam && handleTogglePermission(role.id, perm.code, role.permissionCodes)}
                                        aria-label={`${role.name}: ${perm.code}`}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </>
    );
  }

  function renderSettingsPage(): ReactNode {
    const tabs: Array<{ id: typeof settingsTab; label: string }> = [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
      { id: 'config', label: 'Config' },
      { id: 'notifications', label: 'Notifications' },
    ];

    async function handleSaveProfile() {
      const name = [profileForm.firstName || 'Victor', profileForm.lastName || 'Adeniyi'].filter(Boolean).join(' ');
      const email = profileForm.email || 'victor.a@credpal.com';
      try {
        await apiMutate('PATCH', 'users/me', { name, email });
        setNotice({ message: 'Profile updated successfully', tone: 'info' });
      } catch (err: unknown) {
        setNotice({ message: err instanceof Error ? err.message : 'Failed to save profile', tone: 'warn' });
      }
    }

    async function handleChangePassword() {
      // Super admin uses the direct current-password flow
      if (session?.roleCode === 'super_admin') {
        if (!securityForm.currentPassword) {
          setNotice({ message: 'Current password is required', tone: 'warn' }); return;
        }
        if (securityForm.newPassword.length < 8) {
          setNotice({ message: 'New password must be at least 8 characters', tone: 'warn' }); return;
        }
        if (securityForm.newPassword !== securityForm.confirmPassword) {
          setNotice({ message: 'New passwords do not match', tone: 'warn' }); return;
        }
        try {
          await api.mutate('PATCH', 'users/me/password', { currentPassword: securityForm.currentPassword, newPassword: securityForm.newPassword });
          setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setShowCurrentPwd(false); setShowNewPwd(false); setShowConfirmPwd(false);
          setNotice({ message: 'Password changed successfully', tone: 'info' });
        } catch (err: unknown) {
          setNotice({ message: err instanceof Error ? err.message : 'Failed to change password', tone: 'warn' });
        }
        return;
      }
      // All other roles use the OTP flow
      await handleRequestOtp();
    }

    return (
      <div className="settings-page">
        <div className="settings-page-header">
          <h2>Settings</h2>
          <p>Manage your account and preferences</p>
        </div>

        <div className="customer-tab-bar" role="tablist" aria-label="Settings navigation">
          {tabs.map((tab) => (
            <button key={tab.id} role="tab" aria-selected={settingsTab === tab.id} className={settingsTab === tab.id ? 'customer-tab customer-tab-active' : 'customer-tab'} type="button" onClick={() => setSettingsTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {settingsTab === 'profile' ? (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Profile Information</h3>
                    <p className="eyebrow">Update your personal details</p>
                  </div>
                </div>
                <div className="form-grid" style={{ padding: '0 18px 18px' }}>
                  <label className="field-card">
                    <span className="field-label">First Name</span>
                    <input type="text" value={profileForm.firstName || 'Victor'} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" autoComplete="given-name" />
                  </label>
                  <label className="field-card">
                    <span className="field-label">Last Name</span>
                    <input type="text" value={profileForm.lastName || 'Adeniyi'} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" autoComplete="family-name" />
                  </label>
                  <label className="field-card field-card-wide">
                    <span className="field-label">Email</span>
                    <input type="email" value={profileForm.email || 'victor.a@credpal.com'} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address" autoComplete="email" />
                  </label>
                  <label className="field-card">
                    <span className="field-label">User Type</span>
                    <select value={profileForm.userType || 'Admin'} onChange={(e) => setProfileForm((p) => ({ ...p, userType: e.target.value }))}>
                      <option value="Admin">Admin</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Uploader">Uploader</option>
                    </select>
                  </label>
                </div>
                <div className="panel-footer">
                  <div className="panel-footer-actions">
                    <button className="primary-button" type="button" onClick={handleSaveProfile}>Save changes</button>
                  </div>
                </div>
              </section>
            ) : settingsTab === 'security' ? (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Change Password</h3>
                    <p className="eyebrow">
                      {session?.roleCode === 'super_admin'
                        ? 'Enter your current password to set a new one'
                        : otpStep === 'idle'
                          ? 'Request a verification code sent to your email to change your password'
                          : 'Enter the code from your email and choose a new password'}
                    </p>
                  </div>
                </div>

                {/* Super admin: direct current-password flow */}
                {session?.roleCode === 'super_admin' ? (
                  <div className="form-grid" style={{ padding: '0 18px 18px' }}>
                    <label className="field-card field-card-wide">
                      <span className="field-label">Current Password</span>
                      <div className="password-input-shell">
                        <input type={showCurrentPwd ? 'text' : 'password'} value={securityForm.currentPassword} onChange={(e) => setSecurityForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Enter current password" autoComplete="current-password" />
                        <button type="button" className="password-toggle" onClick={() => setShowCurrentPwd((p) => !p)} aria-label={showCurrentPwd ? 'Hide' : 'Show'}><Icon name={showCurrentPwd ? 'eye-off' : 'eye'} /></button>
                      </div>
                    </label>
                    <label className="field-card">
                      <span className="field-label">New Password</span>
                      <div className="password-input-shell">
                        <input type={showNewPwd ? 'text' : 'password'} value={securityForm.newPassword} onChange={(e) => setSecurityForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min. 8 characters" autoComplete="new-password" />
                        <button type="button" className="password-toggle" onClick={() => setShowNewPwd((p) => !p)} aria-label={showNewPwd ? 'Hide' : 'Show'}><Icon name={showNewPwd ? 'eye-off' : 'eye'} /></button>
                      </div>
                    </label>
                    <label className="field-card">
                      <span className="field-label">Confirm New Password</span>
                      <div className="password-input-shell">
                        <input type={showConfirmPwd ? 'text' : 'password'} value={securityForm.confirmPassword} onChange={(e) => setSecurityForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat new password" autoComplete="new-password" />
                        <button type="button" className="password-toggle" onClick={() => setShowConfirmPwd((p) => !p)} aria-label={showConfirmPwd ? 'Hide' : 'Show'}><Icon name={showConfirmPwd ? 'eye-off' : 'eye'} /></button>
                      </div>
                    </label>
                  </div>
                ) : otpStep === 'idle' ? (
                  /* Non-super-admin: request OTP step */
                  <div style={{ padding: '0 18px 18px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                      A 6-digit verification code will be sent to your registered email address.
                      The code expires in 15 minutes.
                    </p>
                    {otpError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{otpError}</p>}
                  </div>
                ) : (
                  /* Non-super-admin: enter OTP + new password step */
                  <div className="form-grid" style={{ padding: '0 18px 18px' }}>
                    <label className="field-card field-card-wide">
                      <span className="field-label">Verification Code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        autoComplete="one-time-code"
                      />
                    </label>
                    <label className="field-card">
                      <span className="field-label">New Password</span>
                      <div className="password-input-shell">
                        <input type={showOtpPwd ? 'text' : 'password'} value={otpNewPwd} onChange={(e) => setOtpNewPwd(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
                        <button type="button" className="password-toggle" onClick={() => setShowOtpPwd((p) => !p)} aria-label={showOtpPwd ? 'Hide' : 'Show'}><Icon name={showOtpPwd ? 'eye-off' : 'eye'} /></button>
                      </div>
                    </label>
                    <label className="field-card">
                      <span className="field-label">Confirm New Password</span>
                      <div className="password-input-shell">
                        <input type={showOtpPwd ? 'text' : 'password'} value={otpConfirmPwd} onChange={(e) => setOtpConfirmPwd(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
                      </div>
                    </label>
                    {otpError && <p style={{ color: 'var(--danger)', fontSize: 13, gridColumn: '1/-1' }}>{otpError}</p>}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', gridColumn: '1/-1' }}>
                      Didn't receive the code?{' '}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 }} onClick={() => { setOtpStep('idle'); setOtpCode(''); }}>
                        Request a new one
                      </button>
                    </p>
                  </div>
                )}

                <div className="panel-footer">
                  <div className="panel-footer-actions">
                    {session?.roleCode === 'super_admin' ? (
                      <button className="primary-button" type="button" onClick={handleChangePassword}>Change Password</button>
                    ) : otpStep === 'idle' ? (
                      <button className="primary-button" type="button" disabled={otpLoading} onClick={handleChangePassword}>
                        {otpLoading ? 'Sending…' : 'Send Verification Code'}
                      </button>
                    ) : (
                      <button className="primary-button" type="button" disabled={otpLoading} onClick={handleConfirmOtp}>
                        {otpLoading ? 'Verifying…' : 'Change Password'}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            ) : settingsTab === 'config' ? (
              <>
                {/* ── Google Sheets integrations ───────────────────── */}
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Google Sheets Integrations</h3>
                      <p className="eyebrow">Live data sources — replaces manual CSV uploads</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => setGSheetFormOpen((o) => !o)}
                    >
                      {gSheetFormOpen ? 'Cancel' : '+ Link Spreadsheet'}
                    </button>
                  </div>

                  {/* Add integration form */}
                  {gSheetFormOpen && (
                    <div style={{ padding: '0 18px 18px', display: 'grid', gap: 14 }}>
                      <div className="form-grid">
                        <label className="field-card">
                          <span className="field-label">Integration name</span>
                          <input
                            type="text"
                            placeholder="e.g. Q2 Investment Register"
                            value={gSheetForm.name}
                            onChange={(e) => setGSheetForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </label>
                        <label className="field-card">
                          <span className="field-label">Sync frequency</span>
                          <select value={gSheetForm.syncFrequency} onChange={(e) => setGSheetForm((f) => ({ ...f, syncFrequency: e.target.value as typeof gSheetForm.syncFrequency }))}>
                            <option value="manual">Manual only</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </label>
                        <label className="field-card field-card-wide">
                          <span className="field-label">Spreadsheet URL</span>
                          <input
                            type="url"
                            placeholder="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"
                            value={gSheetForm.spreadsheetUrl}
                            onChange={(e) => setGSheetForm((f) => ({ ...f, spreadsheetUrl: e.target.value }))}
                          />
                        </label>
                        <label className="field-card field-card-wide">
                          <span className="field-label">Service Account credentials JSON</span>
                          <span className="field-help">Paste the full JSON from your Google Cloud Service Account key file. Never shared or stored in plaintext.</span>
                          <textarea
                            rows={5}
                            placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "..."\n}'}
                            value={gSheetForm.credentialsJson}
                            onChange={(e) => setGSheetForm((f) => ({ ...f, credentialsJson: e.target.value }))}
                            style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={gSheetBusy === 'creating'}
                          onClick={async () => {
                            const urlMatch = gSheetForm.spreadsheetUrl.match(/\/spreadsheets\/d\/([\w-]+)/);
                            const spreadsheetId = urlMatch?.[1] ?? gSheetForm.spreadsheetUrl.trim();
                            if (!gSheetForm.name.trim() || !spreadsheetId || !gSheetForm.credentialsJson.trim()) {
                              setNotice({ tone: 'warn', message: 'Name, spreadsheet URL, and credentials JSON are required.' });
                              return;
                            }
                            let credentials: Record<string, unknown>;
                            try { credentials = JSON.parse(gSheetForm.credentialsJson) as Record<string, unknown>; }
                            catch { setNotice({ tone: 'warn', message: 'Credentials JSON is not valid JSON.' }); return; }
                            setGSheetBusy('creating');
                            try {
                              const created = await apiMutate<IntegrationItem>('POST', 'integrations', {
                                name: gSheetForm.name.trim(),
                                sourceType: 'google_sheets',
                                secretRef: JSON.stringify(credentials),
                                fieldMapping: {},
                                connectionConfig: { spreadsheetId, authMethod: credentials['type'] === 'service_account' ? 'service_account' : 'oauth2' },
                                syncFrequency: gSheetForm.syncFrequency,
                              });
                              setIntegrationsState((s) => ({
                                ...s,
                                data: s.data ? { items: [created, ...s.data.items], count: s.data.count + 1 } : { items: [created], count: 1 },
                              }));
                              setGSheetForm({ name: '', spreadsheetUrl: '', credentialsJson: '', syncFrequency: 'daily' });
                              setGSheetFormOpen(false);
                              setNotice({ tone: 'info', message: `Integration "${created.name}" created. Click Discover Tabs to map your sheet.` });
                            } catch (err: unknown) {
                              setNotice({ tone: 'warn', message: err instanceof Error ? err.message : 'Failed to create integration.' });
                            } finally {
                              setGSheetBusy(null);
                            }
                          }}
                        >
                          {gSheetBusy === 'creating' ? 'Linking…' : 'Link Spreadsheet'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Integrations list */}
                  <div style={{ padding: '0 18px 18px', display: 'grid', gap: 12 }}>
                    {integrationsState.status === 'loading' && (
                      <div className="empty-state"><div className="empty-state-icon"><Icon name="refresh" /></div><h4>Loading integrations…</h4></div>
                    )}
                    {integrationsState.status === 'error' && (
                      <div className="empty-state"><h4>Failed to load integrations</h4><p>{integrationsState.error}</p></div>
                    )}
                    {integrationsState.status === 'ready' && integrationsState.data!.items.filter((i) => i.sourceType === 'google_sheets').length === 0 && !gSheetFormOpen && (
                      <div className="empty-state" style={{ padding: '32px 0' }}>
                        <div className="empty-state-icon"><Icon name="database" /></div>
                        <h4>No Google Sheets integrations yet</h4>
                        <p>Click <strong>+ Link Spreadsheet</strong> above to connect your first live data source.</p>
                      </div>
                    )}
                    {(integrationsState.data?.items ?? []).filter((i) => i.sourceType === 'google_sheets').map((integration) => {
                      const isExpanded = expandedIntegration === integration.id;
                      const tabs = integrationTabs[integration.id] ?? [];
                      const statusTone = integration.status === 'active' ? 'pill-active' : integration.status === 'failed' ? 'pill-warn' : 'pill-neutral';
                      return (
                        <article key={integration.id} className="panel" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                          <div className="panel-header" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <strong>{integration.name}</strong>
                                <span className={`pill ${statusTone}`}>{integration.status}</span>
                                <span className="pill pill-neutral">{integration.syncFrequency}</span>
                              </div>
                              <span className="eyebrow" style={{ fontSize: '0.76rem' }}>
                                {integration.lastSuccessfulSyncAt ? `Last synced ${new Date(integration.lastSuccessfulSyncAt).toLocaleString()}` : 'Never synced'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {/* Discover tabs */}
                              <button
                                className="btn btn-sm"
                                type="button"
                                disabled={gSheetBusy === `discover-${integration.id}`}
                                onClick={async () => {
                                  setGSheetBusy(`discover-${integration.id}`);
                                  try {
                                    const result = await apiMutate<{ tabs: SheetTabItem[]; count: number }>('POST', `integrations/${integration.id}/discover-tabs`, {});
                                    setIntegrationTabs((t) => ({ ...t, [integration.id]: result.tabs }));
                                    setExpandedIntegration(integration.id);
                                    setNotice({ tone: 'info', message: `Found ${result.count} tab${result.count !== 1 ? 's' : ''}. Configure column mappings below.` });
                                  } catch (err: unknown) {
                                    setNotice({ tone: 'warn', message: err instanceof Error ? err.message : 'Tab discovery failed.' });
                                  } finally {
                                    setGSheetBusy(null);
                                  }
                                }}
                              >
                                {gSheetBusy === `discover-${integration.id}` ? 'Discovering…' : 'Discover Tabs'}
                              </button>

                              {/* Sync now */}
                              <button
                                className="btn btn-sm btn-primary"
                                type="button"
                                disabled={gSheetBusy === `sync-${integration.id}`}
                                onClick={async () => {
                                  setGSheetBusy(`sync-${integration.id}`);
                                  try {
                                    await apiMutate('POST', `integrations/${integration.id}/sync`, {});
                                    setNotice({ tone: 'info', message: `Sync queued for "${integration.name}". Investment records will update shortly.` });
                                    setIntegrationsState((s) => ({ ...s, status: 'idle' }));
                                  } catch (err: unknown) {
                                    setNotice({ tone: 'warn', message: err instanceof Error ? err.message : 'Sync trigger failed.' });
                                  } finally {
                                    setGSheetBusy(null);
                                  }
                                }}
                              >
                                {gSheetBusy === `sync-${integration.id}` ? 'Queuing…' : 'Sync Now'}
                              </button>

                              {/* Show/hide tabs */}
                              {tabs.length > 0 && (
                                <button
                                  className="btn btn-sm"
                                  type="button"
                                  onClick={() => setExpandedIntegration(isExpanded ? null : integration.id)}
                                >
                                  {isExpanded ? 'Hide Tabs' : `${tabs.length} Tab${tabs.length !== 1 ? 's' : ''}`}
                                </button>
                              )}

                              {/* Disable */}
                              {integration.status === 'active' && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  type="button"
                                  onClick={() => openDialog({
                                    title: 'Disable integration',
                                    description: `Stop syncing data from "${integration.name}". Existing investment records are preserved. You can re-enable it at any time.`,
                                    confirmLabel: 'Disable',
                                    tone: 'danger',
                                    onConfirm: async () => {
                                      await apiMutate('DELETE', `integrations/${integration.id}`, {});
                                      setIntegrationsState((s) => ({
                                        ...s,
                                        data: s.data ? {
                                          ...s.data,
                                          items: s.data.items.map((i) => i.id === integration.id ? { ...i, status: 'inactive' as const } : i),
                                        } : null,
                                      }));
                                    },
                                  })}
                                >
                                  Disable
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Tabs panel */}
                          {isExpanded && tabs.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', display: 'grid', gap: 10 }}>
                              <p className="eyebrow" style={{ margin: 0 }}>Sheet tabs — configure column mapping per tab</p>
                              {tabs.map((tab) => (
                                <div key={tab.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.88rem' }}>{tab.sheetTitle}</strong>
                                    <p className="eyebrow" style={{ margin: '2px 0 0', fontSize: '0.74rem' }}>
                                      Range: {tab.rangeNotation} •{' '}
                                      {tab.lastRowCount !== null ? `${tab.lastRowCount} rows` : 'Not synced yet'} •{' '}
                                      {tab.lastSyncedAt ? `Synced ${new Date(tab.lastSyncedAt).toLocaleDateString()}` : 'Pending first sync'}
                                    </p>
                                    {Object.keys(tab.columnMapping).length > 0 && (
                                      <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                        {Object.entries(tab.columnMapping).slice(0, 4).map(([k, v]) => `"${k}" → ${v}`).join(' • ')}
                                        {Object.keys(tab.columnMapping).length > 4 ? ` +${Object.keys(tab.columnMapping).length - 4} more` : ''}
                                      </p>
                                    )}
                                    {Object.keys(tab.columnMapping).length === 0 && (
                                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--warn)' }}>No column mapping — syncer will auto-detect headers</p>
                                    )}
                                  </div>
                                  <span className={`pill ${tab.status === 'active' ? 'pill-active' : 'pill-neutral'}`}>{tab.status}</span>
                                  <button
                                    className="btn btn-sm"
                                    type="button"
                                    disabled={gSheetBusy === `tab-${tab.id}`}
                                    onClick={async () => {
                                      setGSheetBusy(`tab-${tab.id}`);
                                      try {
                                        const newStatus: 'active' | 'ignored' = tab.status === 'active' ? 'ignored' : 'active';
                                        await apiMutate('PATCH', `integrations/${integration.id}/tabs/${tab.id}`, { status: newStatus });
                                        setIntegrationTabs((t) => ({
                                          ...t,
                                          [integration.id]: (t[integration.id] ?? []).map((tt) => tt.id === tab.id ? { ...tt, status: newStatus } : tt),
                                        }));
                                      } catch (err: unknown) {
                                        setNotice({ tone: 'warn', message: err instanceof Error ? err.message : 'Failed to update tab.' });
                                      } finally {
                                        setGSheetBusy(null);
                                      }
                                    }}
                                  >
                                    {tab.status === 'active' ? 'Ignore' : 'Enable'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : (
          <section className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Notification Preferences</h3>
                    <p className="eyebrow">Control how you receive alerts</p>
                  </div>
                </div>
                <div className="form-grid" style={{ padding: '0 18px 18px' }}>
                  {[
                    { label: 'Upload completed', description: 'Notify when a CSV upload finishes processing' },
                    { label: 'Upload failed', description: 'Notify when a CSV upload encounters errors' },
                    { label: 'Report ready', description: 'Notify when a report export is ready to download' },
                    { label: 'User invited', description: 'Notify when a new admin user is invited' },
                  ].map((pref) => (
                    <label key={pref.label} className="field-card field-card-toggle">
                      <div>
                        <span className="field-label">{pref.label}</span>
                        <span className="field-help">{pref.description}</span>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </label>
                  ))}
                </div>
              </section>
        )}
      </div>
    );
  }

  function renderUploadsPage(): ReactNode {
    const items = uploadItems;
    const idle = { status: 'idle' as const, data: null, error: null };

    function resetAllOverviews() {
      setPortfolioOverview(idle);
      setInvestmentsOverview(idle);
      setWealthManagersOverview(idle);
      setSummaryOverview(idle);
      setUploadsOverview(idle);
    }

    async function handleClearAllData() {
      try {
        await apiMutate('DELETE', 'uploads');
        resetAllOverviews();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to clear data. Please try again.');
      }
    }

    async function handleUploadFile() {
      if (!uploadedFile) return;
      // Step 1 — wipe existing data so new file is the sole source of truth
      await apiMutate('DELETE', 'uploads');
      // Step 2 — ingest the new CSV directly via the API
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const response = await fetch(`${API_BASE_URL}/uploads/ingest`, {
        method: 'POST',
        headers: dashboardRequestHeaders,
        body: formData,
      });
      if (!response.ok) {
        // Use the same error-envelope parser so the message matches other API errors.
        const requestId = response.headers.get('x-request-id') ?? undefined;
        try {
          const body = await response.json() as { message?: string | string[] };
          const msg = Array.isArray(body.message) ? body.message.join(' · ') : (body.message ?? `HTTP ${response.status}`);
          throw new ApiError(response.status, msg, requestId);
        } catch (inner) {
          if (inner instanceof ApiError) throw inner;
          throw new ApiError(response.status, `HTTP ${response.status}`, requestId);
        }
      }
      // Step 3 — reset all views so they re-fetch on next navigation
      const name = uploadedFile.name;
      setUploadedFile(null);
      setSelectedUploadName('');
      resetAllOverviews();
      setNotice({ tone: 'good', message: `"${name}" uploaded — validation running. Once complete the batch will show "validated" in the table below. Click Confirm import to load the data.` });
    }

    return (
      <div className="uploads-page">
        <section className="panel upload-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Source of truth</p>
              <h3>Upload dataset</h3>
            </div>
            {items.length > 0 ? (
              <button
                className="danger-button"
                type="button"
                onClick={() => openDialog({
                  title: 'Clear all data',
                  description: `This will permanently delete all ${items.length} upload batch${items.length !== 1 ? 'es' : ''} and every investment record imported from them. All portfolio, investment, and manager data will be wiped. This cannot be undone.`,
                  confirmLabel: 'Clear all data',
                  tone: 'danger',
                  onConfirm: handleClearAllData,
                })}
              >
                Clear all data
              </button>
            ) : null}
          </div>

          <label
            htmlFor="upload-file-input"
            className={isDragOver ? 'upload-dropzone upload-dropzone-over' : 'upload-dropzone'}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-dropzone-icon">
              <Icon name="briefcase" />
            </div>
            {selectedUploadName ? (
              <>
                <p className="upload-dropzone-filename">{selectedUploadName}</p>
                <span className="upload-dropzone-hint">Click to replace</span>
              </>
            ) : (
              <>
                <p className="upload-dropzone-label">Drop a CSV file here</p>
                <span className="upload-dropzone-hint">or click to browse</span>
              </>
            )}
            <input
              id="upload-file-input"
              type="file"
              accept=".csv,text/csv"
              className="upload-input-hidden"
              onChange={handleUploadSelection}
            />
          </label>
          {selectedUploadName ? (
            <div className="upload-panel-action">
              <button
                className="secondary-button"
                type="button"
                onClick={() => { setSelectedUploadName(''); setUploadedFile(null); }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => openDialog({
                  title: items.length > 0 ? 'Replace dataset' : 'Upload CSV',
                  description: items.length > 0
                    ? `Uploading "${selectedUploadName}" will permanently delete all ${items.length} existing batch${items.length !== 1 ? 'es' : ''} and every investment record linked to them. The new file becomes the sole source of truth.`
                    : `"${selectedUploadName}" will be submitted for validation and import.`,
                  confirmLabel: items.length > 0 ? 'Replace & upload' : 'Upload',
                  tone: items.length > 0 ? 'danger' : 'default',
                  onConfirm: handleUploadFile,
                })}
              >
                {items.length > 0 ? 'Replace dataset' : 'Upload file'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel table-panel">
          <div className="panel-header">
            <h3>Upload history</h3>
            <span className="table-count">{items.length} {items.length === 1 ? 'batch' : 'batches'}</span>
          </div>
          {uploadsOverview.status === 'loading' && items.length === 0 ? (
            <div className="empty-state" role="status">
              <div className="empty-state-icon"><Icon name="refresh" /></div>
              <h4>Loading history</h4>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="briefcase" /></div>
              <h4>No uploads yet</h4>
              <p>Drop a CSV file above to get started.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">File</th>
                    <th scope="col">Total</th>
                    <th scope="col">Valid</th>
                    <th scope="col">Invalid</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ width: 220 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const tone = item.status === 'imported' || item.status === 'partially_imported' ? 'good' : item.status === 'failed' ? 'warn' : 'neutral';
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.fileName}</strong></td>
                        <td>{formatCount(item.totalRows)}</td>
                        <td>{formatCount(item.validRows)}</td>
                        <td>{formatCount(item.invalidRows)}</td>
                        <td>{formatShortDate(item.createdAt)}</td>
                        <td><span className={`pill pill-${tone}`}>{item.status.replace(/_/g, ' ')}</span></td>
                        <td className="upload-actions-cell">
                          <div className="upload-actions-wrap">
                            {(item.status === 'validated' || item.status === 'importing' || item.status === 'partially_imported') && (
                              <button
                                className="table-action table-action-confirm"
                                type="button"
                                onClick={() => openDialog({
                                  title: item.status === 'partially_imported' ? 'Retry import' : 'Confirm import',
                                  description: item.status === 'partially_imported'
                                    ? `Only some rows were imported last time. This will insert the remaining rows that are not yet in the database. Already-imported records will not be duplicated.`
                                    : `Import ${formatCount(item.validRows)} valid row${item.validRows !== 1 ? 's' : ''} from "${item.fileName}" into the investment database. ${formatCount(item.invalidRows)} invalid row${item.invalidRows !== 1 ? 's' : ''} will be skipped.`,
                                  confirmLabel: item.status === 'partially_imported' ? 'Retry import' : `Import ${formatCount(item.validRows)} rows`,
                                  tone: 'default',
                                  onConfirm: async () => {
                                    await apiMutate('POST', `uploads/${item.id}/confirm`, {});
                                    setPortfolioOverview({ status: 'idle', data: null, error: null });
                                    setInvestmentsOverview({ status: 'idle', data: null, error: null });
                                    setWealthManagersOverview({ status: 'idle', data: null, error: null });
                                    setSummaryOverview({ status: 'idle', data: null, error: null });
                                    // Re-fetch uploads immediately so the table stays visible with updated status
                                    try {
                                      const refreshed = await fetchViewData<UploadHistoryOverview>('uploads/history');
                                      setUploadsOverview({ status: 'ready', data: refreshed, error: null });
                                    } catch {
                                      setUploadsOverview({ status: 'idle', data: null, error: null });
                                    }
                                    setNotice({ tone: 'info', message: `Import queued — records are being written to the database. All views will refresh shortly.` });
                                  },
                                })}
                              >
                                {item.status === 'partially_imported' ? 'Retry import' : 'Confirm import'}
                              </button>
                            )}
                            <button
                              className="table-action table-action-danger"
                              type="button"
                              onClick={() => openDialog({
                                title: 'Delete batch',
                                description: `"${item.fileName}" and all investment records imported from it (${formatCount(item.validRows)} valid rows) will be permanently deleted. Other batches are unaffected.`,
                                confirmLabel: 'Delete batch',
                                tone: 'danger',
                                onConfirm: async () => {
                                  await apiMutate('DELETE', 'uploads', { ids: [item.id] });
                                  setPortfolioOverview({ status: 'idle', data: null, error: null });
                                  setInvestmentsOverview({ status: 'idle', data: null, error: null });
                                  setWealthManagersOverview({ status: 'idle', data: null, error: null });
                                  setSummaryOverview({ status: 'idle', data: null, error: null });
                                  setUploadsOverview({ status: 'idle', data: null, error: null });
                                },
                              })}
                            >
                              Delete<Icon name="x" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderCustomerDrawer(): ReactNode {
    if (!customerDrawer) return null;
    const c = customerDrawer;
    const leadTenor = getLeadingTenor(c.tenorExposure);

    return (
      <>
        <div className="drawer-scrim" onClick={() => setCustomerDrawer(null)} aria-hidden="true" />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={c.customerName}>
          <div className="drawer-header">
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Customer</p>
              <h3>{c.customerName}</h3>
            </div>
            <button className="icon-button" type="button" onClick={() => setCustomerDrawer(null)} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div className="form-grid form-grid-2col">
              <div className="field-card">
                <span className="field-label">Total Investment</span>
                <p className="field-value">{formatCurrency(c.totalInvestment)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Investments</span>
                <p className="field-value">{formatCount(c.investmentCount)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Book Share</span>
                <p className="field-value">{formatPercent(c.contributionPercentage)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Customer Type</span>
                <p className="field-value">{formatCustomerType(c.customerType)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Inflow</span>
                <p className="field-value">{formatCurrency(c.inflowValue)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Rollover</span>
                <p className="field-value">{formatCurrency(c.rolloverValue)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Last Amount</span>
                <p className="field-value">{formatCurrency(c.lastInvestmentAmount)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Last Date</span>
                <p className="field-value">{formatShortDate(c.lastInvestmentDate)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Top Tenor</span>
                <p className="field-value">{leadTenor.label}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Tenor Value</span>
                <p className="field-value">{formatCurrency(leadTenor.value)}</p>
              </div>
              <div className="field-card field-card-wide">
                <span className="field-label">Customer ID</span>
                <p className="field-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{c.customerId}</p>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button className="secondary-button" type="button" onClick={() => setCustomerDrawer(null)}>Close</button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setCustomerDrawer(null);
                navigate(`/portfolio/${c.customerId}`, { state: { customer: c, from: location.pathname } });
              }}
            >
              View details
            </button>
          </div>
        </aside>
      </>
    );
  }

  function renderInvestmentDrawer(): ReactNode {
    if (!investmentDrawer) return null;
    const item = investmentDrawer;
    const tone = getToneFromMeta(`${item.recordStatus} ${item.importStatus}`);

    return (
      <>
        <div className="drawer-scrim" onClick={() => setInvestmentDrawer(null)} aria-hidden="true" />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label="Investment record">
          <div className="drawer-header">
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Investment</p>
              <h3>{item.customerName}</h3>
            </div>
            <button className="icon-button" type="button" onClick={() => setInvestmentDrawer(null)} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <span className={`pill pill-${tone}`}>{item.recordStatus}</span>
              <span className={`pill pill-${tone}`}>{item.importStatus}</span>
            </div>
            <div className="form-grid form-grid-2col">
              <div className="field-card">
                <span className="field-label">Amount</span>
                <p className="field-value">{formatCurrency(Number(item.investmentAmount))}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Currency</span>
                <p className="field-value">{formatCurrencyCode(item.currency)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Fund Type</span>
                <p className="field-value">{item.fundType}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Tenor</span>
                <p className="field-value">{formatCount(item.tenorDays)} days</p>
              </div>
              <div className="field-card">
                <span className="field-label">Classification</span>
                <p className="field-value">{formatTenorLabel(item.tenorCategory)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Customer Type</span>
                <p className="field-value">{formatCustomerType(item.customerType)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Mobilised</span>
                <p className="field-value">{formatShortDate(item.mobilisationDate)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Maturity</span>
                <p className="field-value">{formatShortDate(item.maturityDate)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Manager</span>
                <p className="field-value">{item.relationshipManager ?? '—'}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Channel</span>
                <p className="field-value">{item.sourceChannel ?? item.dataSource}</p>
              </div>
              {item.investmentReference ? (
                <div className="field-card field-card-wide">
                  <span className="field-label">Reference</span>
                  <p className="field-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{item.investmentReference}</p>
                </div>
              ) : null}
              {item.costOfFunds ? (
                <div className="field-card">
                  <span className="field-label">Cost of Funds</span>
                  <p className="field-value">{item.costOfFunds}%</p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="drawer-footer">
            <button className="secondary-button" type="button" onClick={() => setInvestmentDrawer(null)}>Close</button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setInvestmentDrawer(null);
                navigate(`/investments/${item.id}`, { state: { investment: item, from: location.pathname } });
              }}
            >
              View details
            </button>
          </div>
        </aside>
      </>
    );
  }

  function renderManagerDrawer(): ReactNode {
    if (!managerDrawer) return null;
    const m = managerDrawer;
    const dominantBucket = getDominantFundsAgingBucket(m.fundsAging);

    return (
      <>
        <div className="drawer-scrim" onClick={() => setManagerDrawer(null)} aria-hidden="true" />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={m.relationshipManager}>
          <div className="drawer-header">
            <div>
              <p className="eyebrow" style={{ marginBottom: 4 }}>WEALTH Manager</p>
              <h3>{m.relationshipManager}</h3>
            </div>
            <button className="icon-button" type="button" onClick={() => setManagerDrawer(null)} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div className="form-grid form-grid-2col">
              <div className="field-card">
                <span className="field-label">AUM</span>
                <p className="field-value">{formatCurrency(m.totalAum)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Accounts</span>
                <p className="field-value">{formatCount(m.investmentAccountCount)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">NTB Volume</span>
                <p className="field-value">{formatCurrency(m.ntbMetrics.volume)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">NTB Customers</span>
                <p className="field-value">{formatCount(m.ntbMetrics.customerCount)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Returning Volume</span>
                <p className="field-value">{formatCurrency(m.returningCustomerMetrics.volume)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Returning Customers</span>
                <p className="field-value">{formatCount(m.returningCustomerMetrics.customerCount)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Inflow</span>
                <p className="field-value">{formatCurrency(m.inflowValue)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Rollover</span>
                <p className="field-value">{formatCurrency(m.rolloverValue)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Avg / Customer</span>
                <p className="field-value">{formatCurrency(m.averageInvestmentPerCustomer)}</p>
              </div>
              <div className="field-card">
                <span className="field-label">Dominant Aging</span>
                <p className="field-value">{dominantBucket.label}</p>
              </div>
              {m.topCustomers[0] ? (
                <div className="field-card field-card-wide">
                  <span className="field-label">Top Customer</span>
                  <p className="field-value">{m.topCustomers[0].customerName} — {formatCurrency(m.topCustomers[0].totalInvestment)}</p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="drawer-footer">
            <button className="secondary-button" type="button" onClick={() => setManagerDrawer(null)}>Close</button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setManagerDrawer(null);
                navigate(`/wealth-managers/${encodeURIComponent(m.relationshipManager)}`, { state: { manager: m, from: location.pathname } });
              }}
            >
              View details
            </button>
          </div>
        </aside>
      </>
    );
  }

  function renderReportDrawer(): ReactNode {
    if (!reportDrawer) return null;
    const item = reportDrawer;
    const tone = item.status === 'completed' ? 'good' : item.status === 'failed' ? 'warn' : 'neutral';

    return (
      <>
        <div className="drawer-scrim" onClick={() => setReportDrawer(null)} aria-hidden="true" />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label="Report export">
          <div className="drawer-header">
            <div>
              <h3>{formatReportType(item.reportType)} Export</h3>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span className={`pill pill-${tone}`}>{item.status}</span>
                <span className="pill pill-neutral">{formatOutputFormat(item.outputFormat)}</span>
              </div>
            </div>
            <button className="icon-button" type="button" onClick={() => setReportDrawer(null)} aria-label="Close"><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div className="drawer-info-list">
              <div className="drawer-info-row"><span>Report Type</span><strong>{formatReportType(item.reportType)}</strong></div>
              <div className="drawer-info-row"><span>Format</span><strong>{formatOutputFormat(item.outputFormat)}</strong></div>
              <div className="drawer-info-row"><span>Status</span><strong>{item.status}</strong></div>
              <div className="drawer-info-row"><span>Requested By</span><strong>{item.requestedBy}</strong></div>
              <div className="drawer-info-row"><span>Created</span><strong>{formatDateTime(item.createdAt)}</strong></div>
              {item.completedAt ? <div className="drawer-info-row"><span>Completed</span><strong>{formatDateTime(item.completedAt)}</strong></div> : null}
              {item.fileSizeBytes ? <div className="drawer-info-row"><span>File Size</span><strong>{Math.round(item.fileSizeBytes / 1024)} KB</strong></div> : null}
              {item.errorMessage ? <div className="drawer-info-row"><span>Error</span><strong style={{ color: 'var(--warn, #ca8a04)' }}>{item.errorMessage}</strong></div> : null}
            </div>
          </div>
          <div className="drawer-footer">
            <button className="secondary-button" type="button" onClick={() => setReportDrawer(null)}>Close</button>
            {item.fileUrl ? (
              <a className="primary-button" href={item.fileUrl} download target="_blank" rel="noreferrer">
                Download
              </a>
            ) : null}
          </div>
        </aside>
      </>
    );
  }

  function renderCustomerDetailPage(customer: PortfolioCustomer): ReactNode {
    const tenorData = Object.entries(customer.tenorExposure)
      .sort(([, a], [, b]) => b - a)
      .map(([key, value]) => ({ label: formatTenorLabel(key), value }));
    const relatedInvestments = investmentItems.filter((i) => i.customerId === customer.customerId);
    const gridStroke = 'rgba(20, 41, 37, 0.06)';

    return (
      <div className="trends-charts-page">
        <div className="detail-back-bar">
          <button type="button" className="detail-back-button" onClick={() => navigate(detailRoute?.from ?? '/portfolio')}>
            <Icon name="chevron" />
            {backLabelFromPath(detailRoute?.from ?? '/portfolio')}
          </button>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{customer.customerId}</p>
              <h2 className="detail-page-title">{customer.customerName}</h2>
            </div>
            <span className="pill pill-neutral">{formatCustomerType(customer.customerType)}</span>
          </div>
        </section>

        <div className="detail-kpi-grid">
          <article className="panel metric-card metric-card-good">
            <p>Total Investment</p>
            <strong>{formatCurrency(customer.totalInvestment)}</strong>
            <span className="metric-delta metric-delta-good">{formatCount(customer.investmentCount)} investments</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Book Share</p>
            <strong>{formatPercent(customer.contributionPercentage)}</strong>
            <span className="metric-delta metric-delta-neutral">of total portfolio</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Inflow</p>
            <strong>{formatCurrency(customer.inflowValue)}</strong>
            <span className="metric-delta metric-delta-neutral">Rollover: {formatCurrency(customer.rolloverValue)}</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Last Investment</p>
            <strong>{formatShortDate(customer.lastInvestmentDate)}</strong>
            <span className="metric-delta metric-delta-neutral">{formatCurrency(customer.lastInvestmentAmount)}</span>
          </article>
        </div>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Tenor</p><h3>Exposure breakdown</h3></div>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={tenorData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} stroke={gridStroke} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} fill={chartToneColors.brand} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Fund Mix</p><h3>Inflow vs rollover</h3></div>
              <strong className="trends-kpi">{formatCurrency(customer.totalInvestment)}</strong>
            </div>
            <div className="summary-kpi-list">
              <div className="summary-kpi-row"><span className="trends-period-label">Inflow</span><strong>{formatCurrency(customer.inflowValue)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Rollover</span><strong>{formatCurrency(customer.rolloverValue)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Last amount</span><strong>{formatCurrency(customer.lastInvestmentAmount)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Last date</span><strong>{formatShortDate(customer.lastInvestmentDate)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Customer ID</span><strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{customer.customerId}</strong></div>
            </div>
          </article>
        </div>

        {relatedInvestments.length > 0 ? (
          <section className="panel table-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Ledger</p>
                <h3>Investment records for {customer.customerName}</h3>
              </div>
              <span className="table-count">{relatedInvestments.length} records on this page</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Investment ID</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Customer Class</th>
                    <th scope="col">Inflow</th>
                    <th scope="col">Rollover</th>
                    <th scope="col">Funds Class</th>
                    <th scope="col">Tenure</th>
                    <th scope="col">Creation Date</th>
                    <th scope="col">Maturity Date</th>
                    <th scope="col">Days to Maturity</th>
                    <th scope="col">Act. Officer</th>
                    <th scope="col">Team</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedInvestments.map((inv) => {
                    const t = getToneFromMeta(`${inv.recordStatus} ${inv.importStatus}`);
                    const rd2m = inv.days2Maturity;
                    return (
                      <tr key={inv.id}>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inv.investmentReference ?? inv.id.slice(0, 8)}</span></td>
                        <td><span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span></td>
                        <td><span className={`pill pill-${inv.customerType === 'new' ? 'good' : 'neutral'}`}>{inv.customerType === 'new' ? 'NTB' : 'Returning'}</span></td>
                        <td>{inv.fundType === 'inflow' ? <span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span> : <span className="table-secondary-copy">—</span>}</td>
                        <td>{inv.fundType === 'rollover' ? <span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span> : <span className="table-secondary-copy">—</span>}</td>
                        <td><span className="table-secondary-copy">{formatTenorLabel(inv.tenorCategory)}</span></td>
                        <td><span className="table-secondary-copy">{formatCount(inv.tenorDays)}d</span></td>
                        <td><span className="table-secondary-copy">{formatShortDate(inv.mobilisationDate)}</span></td>
                        <td><span className="table-secondary-copy">{formatShortDate(inv.maturityDate)}</span></td>
                        <td>{rd2m === null ? <span className="table-secondary-copy">—</span> : <span className={`pill pill-${rd2m < 0 ? 'danger' : rd2m <= 30 ? 'warn' : 'neutral'}`}>{rd2m < 0 ? `${Math.abs(rd2m)}d ago` : `${rd2m}d`}</span>}</td>
                        <td><span className="table-secondary-copy">{inv.relationshipManager ?? '—'}</span></td>
                        <td><span className="table-secondary-copy">{inv.team ?? '—'}</span></td>
                        <td><span className="table-secondary-copy">{inv.sourceChannel ?? '—'}</span></td>
                        <td><span className={`pill pill-${t}`}>{inv.importStatus}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="database" /></div>
              <h4>No investment records on this page</h4>
              <p>Navigate to Investments and search for {customer.customerId} to find related ledger entries.</p>
            </div>
          </section>
        )}
      </div>
    );
  }

  function renderInvestmentDetailPage(item: InvestmentRecordItem): ReactNode {
    const tone = getToneFromMeta(`${item.recordStatus} ${item.importStatus}`);
    const relatedByCustomer = investmentItems.filter((i) => i.customerId === item.customerId && i.id !== item.id);
    const d2m = item.days2Maturity;
    const d2mTone = d2m === null ? 'neutral' : d2m < 0 ? 'danger' : d2m <= 30 ? 'warn' : 'good';

    return (
      <div className="trends-charts-page">
        <div className="detail-back-bar">
          <button type="button" className="detail-back-button" onClick={() => navigate(detailRoute?.from ?? '/investments')}>
            <Icon name="chevron" />
            {backLabelFromPath(detailRoute?.from ?? '/investments')}
          </button>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{item.investmentReference ?? item.id}</p>
              <h2 className="detail-page-title">{item.customerName}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`pill pill-${item.customerType === 'new' ? 'good' : 'neutral'}`}>{item.customerType === 'new' ? 'NTB' : 'Returning'}</span>
              <span className={`pill pill-${tone}`}>{item.importStatus}</span>
            </div>
          </div>
        </section>

        <div className="detail-kpi-grid">
          <article className="panel metric-card metric-card-good">
            <p>Amount</p>
            <strong>{formatCurrency(Number(item.investmentAmount))}</strong>
            <span className="metric-delta metric-delta-neutral">{formatCurrencyCode(item.currency)}</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Funds Class</p>
            <strong>{formatTenorLabel(item.tenorCategory)}</strong>
            <span className="metric-delta metric-delta-neutral">{item.fundType === 'inflow' ? 'Inflow' : 'Rollover'}</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Tenure</p>
            <strong>{formatCount(item.tenorDays)} days</strong>
            <span className="metric-delta metric-delta-neutral">Creation: {formatShortDate(item.mobilisationDate)}</span>
          </article>
          <article className={`panel metric-card metric-card-${d2mTone}`}>
            <p>Days to Maturity</p>
            <strong>{d2m === null ? '—' : d2m < 0 ? `${Math.abs(d2m)}d overdue` : `${d2m}d`}</strong>
            <span className="metric-delta metric-delta-neutral">Maturity: {formatShortDate(item.maturityDate)}</span>
          </article>
        </div>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact"><div><p className="eyebrow">Investment</p><h3>Investment details</h3></div></div>
            <div className="summary-kpi-list">
              <div className="summary-kpi-row"><span className="trends-period-label">Investment ID</span><strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.investmentReference ?? '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">User ID</span><strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.customerId}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Customer Class</span><strong>{item.customerType === 'new' ? 'NTB (New to Bank)' : 'Returning'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Inflow</span><strong>{item.fundType === 'inflow' ? formatCurrency(Number(item.investmentAmount)) : '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Rollover</span><strong>{item.fundType === 'rollover' ? formatCurrency(Number(item.investmentAmount)) : '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Cost of Funds</span><strong>{item.costOfFunds ? `${item.costOfFunds}%` : '—'}</strong></div>
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact"><div><p className="eyebrow">Operations</p><h3>Operational details</h3></div></div>
            <div className="summary-kpi-list">
              <div className="summary-kpi-row"><span className="trends-period-label">Act. Officer</span><strong>{item.relationshipManager ?? '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Team</span><strong>{item.team ?? '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Channel</span><strong>{item.sourceChannel ?? '—'}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Status</span><strong>{item.importStatus}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Creation Date</span><strong>{formatShortDate(item.mobilisationDate)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Maturity Date</span><strong>{formatShortDate(item.maturityDate)}</strong></div>
            </div>
          </article>
        </div>

        {relatedByCustomer.length > 0 ? (
          <section className="panel table-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Same customer</p>
                <h3>Other investments by {item.customerName}</h3>
              </div>
              <span className="table-count">{relatedByCustomer.length} records</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Investment ID</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Inflow</th>
                    <th scope="col">Rollover</th>
                    <th scope="col">Tenure</th>
                    <th scope="col">Funds Class</th>
                    <th scope="col">Creation Date</th>
                    <th scope="col">Maturity Date</th>
                    <th scope="col">Days to Maturity</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedByCustomer.map((inv) => {
                    const t = getToneFromMeta(`${inv.recordStatus} ${inv.importStatus}`);
                    const rd2m = inv.days2Maturity;
                    return (
                      <tr key={inv.id}>
                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{inv.investmentReference ?? inv.id.slice(0, 8)}</span></td>
                        <td><span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span></td>
                        <td>{inv.fundType === 'inflow' ? <span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span> : <span className="table-secondary-copy">—</span>}</td>
                        <td>{inv.fundType === 'rollover' ? <span className="table-value-strong">{formatCurrency(Number(inv.investmentAmount))}</span> : <span className="table-secondary-copy">—</span>}</td>
                        <td><span className="table-secondary-copy">{formatCount(inv.tenorDays)}d</span></td>
                        <td><span className="table-secondary-copy">{formatTenorLabel(inv.tenorCategory)}</span></td>
                        <td><span className="table-secondary-copy">{formatShortDate(inv.mobilisationDate)}</span></td>
                        <td><span className="table-secondary-copy">{formatShortDate(inv.maturityDate)}</span></td>
                        <td>{rd2m === null ? <span className="table-secondary-copy">—</span> : <span className={`pill pill-${rd2m < 0 ? 'danger' : rd2m <= 30 ? 'warn' : 'neutral'}`}>{rd2m < 0 ? `${Math.abs(rd2m)}d ago` : `${rd2m}d`}</span>}</td>
                        <td><span className={`pill pill-${t}`}>{inv.importStatus}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderManagerDetailPage(manager: WealthManagerRecord): ReactNode {
    const agingItems = getFundsAgingDisplayItems(manager.fundsAging);
    const agingData = agingItems.map((i) => ({ label: i.label, value: i.value }));
    const agingTotal = agingItems.reduce((s, i) => s + i.value, 0);
    const gridStroke = 'rgba(20, 41, 37, 0.06)';

    return (
      <div className="trends-charts-page">
        <div className="detail-back-bar">
          <button type="button" className="detail-back-button" onClick={() => navigate(detailRoute?.from ?? '/wealth-managers')}>
            <Icon name="chevron" />
            {backLabelFromPath(detailRoute?.from ?? '/wealth-managers')}
          </button>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">WEALTH Manager</p>
              <h2 className="detail-page-title">{manager.relationshipManager}</h2>
            </div>
          </div>
        </section>

        <div className="detail-kpi-grid">
          <article className="panel metric-card metric-card-good">
            <p>AUM</p>
            <strong>{formatCurrency(manager.totalAum)}</strong>
            <span className="metric-delta metric-delta-neutral">{formatCount(manager.investmentAccountCount)} accounts</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>NTB Volume</p>
            <strong>{formatCurrency(manager.ntbMetrics.volume)}</strong>
            <span className="metric-delta metric-delta-neutral">{formatCount(manager.ntbMetrics.customerCount)} customers</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Returning Volume</p>
            <strong>{formatCurrency(manager.returningCustomerMetrics.volume)}</strong>
            <span className="metric-delta metric-delta-neutral">{formatCount(manager.returningCustomerMetrics.customerCount)} customers</span>
          </article>
          <article className="panel metric-card metric-card-neutral">
            <p>Avg / Customer</p>
            <strong>{formatCurrency(manager.averageInvestmentPerCustomer)}</strong>
            <span className="metric-delta metric-delta-neutral">per customer average</span>
          </article>
        </div>

        <div className="trends-chart-grid">
          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Aging</p><h3>Funds aging buckets</h3></div>
              <strong className="trends-kpi">{formatCurrency(agingTotal)}</strong>
            </div>
            <div className="trends-chart-canvas">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={agingData}>
                  <CartesianGrid vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartToneColors.muted, fontSize: 11 }} width={60} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} fill={chartToneColors.brand} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel trends-chart-panel">
            <div className="panel-header compact">
              <div><p className="eyebrow">Portfolio</p><h3>Mix &amp; metrics</h3></div>
            </div>
            <div className="summary-kpi-list">
              <div className="summary-kpi-row"><span className="trends-period-label">Inflow</span><strong>{formatCurrency(manager.inflowValue)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Rollover</span><strong>{formatCurrency(manager.rolloverValue)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">NTB Mobilisation</span><strong>{formatCurrency(manager.newCustomerMobilisation.investmentValue)}</strong></div>
              <div className="summary-kpi-row"><span className="trends-period-label">Returning Mobilisation</span><strong>{formatCurrency(manager.returningCustomerMobilisation.investmentValue)}</strong></div>
            </div>
          </article>
        </div>

        {manager.topCustomers.length > 0 ? (
          <section className="panel table-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customers</p>
                <h3>Top customers under {manager.relationshipManager}</h3>
              </div>
              <span className="table-count">{manager.topCustomers.length} customers</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" className="table-rank-col">Rank</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Total Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {manager.topCustomers.map((tc, i) => (
                    <tr key={tc.customerId}>
                      <td className="table-rank-col">{i + 1}</td>
                      <td>
                        <div className="table-primary-cell">
                          <strong>{tc.customerName}</strong>
                          <small>{tc.customerId}</small>
                        </div>
                      </td>
                      <td><span className="table-value-strong">{formatCurrency(tc.totalInvestment)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderWorkbench(): ReactNode {
    return null;
  }

  // ─── Public routes — accessible without session ──────────────────────────

  if (location.pathname === '/forgot-password') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">WealthTrack</div>
          <h2 className="auth-title">Forgot your password?</h2>
          {forgotSent ? (
            <>
              <p className="auth-body">
                If <strong>{forgotEmail}</strong> is registered, we've sent a reset link. Check your inbox (and spam folder).
              </p>
              <button className="primary-button" type="button" style={{ width: '100%' }} onClick={() => navigate('/login', { replace: true })}>
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="auth-body">Enter your email and we'll send you a link to reset your password.</p>
              {forgotError && <p className="auth-error">{forgotError}</p>}
              <label className="auth-field">
                <span>Email address</span>
                <input type="email" autoFocus value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleForgotPassword(); }}
                  placeholder="you@company.com" autoComplete="email" />
              </label>
              <button className="primary-button" type="button" disabled={forgotLoading} style={{ width: '100%' }} onClick={() => void handleForgotPassword()}>
                {forgotLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button className="auth-link-btn" type="button" onClick={() => navigate('/login', { replace: true })}>Back to sign in</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (location.pathname === '/reset-password' || location.pathname === '/set-password') {
    const params = new URLSearchParams(location.search);
    const tokenId = params.get('id') ?? '';
    const token = params.get('token') ?? '';
    const purpose = location.pathname === '/set-password' ? 'set' : 'reset';
    const title = purpose === 'set' ? 'Set your password' : 'Reset your password';
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">WealthTrack</div>
          <h2 className="auth-title">{title}</h2>
          {resetDone ? (
            <>
              <p className="auth-body">Your password has been {purpose === 'set' ? 'set' : 'reset'} successfully. You can now sign in.</p>
              <button className="primary-button" type="button" style={{ width: '100%' }} onClick={() => { setResetDone(false); navigate('/login', { replace: true }); }}>
                Sign in
              </button>
            </>
          ) : (
            <>
              {!tokenId || !token ? (
                <p className="auth-error">This link is invalid or has expired. Please request a new one.</p>
              ) : (
                <>
                  {resetError && <p className="auth-error">{resetError}</p>}
                  <label className="auth-field">
                    <span>New Password</span>
                    <div className="password-input-shell">
                      <input type={showLoginPwd ? 'text' : 'password'} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)}
                        placeholder="Min. 8 characters" autoComplete="new-password" autoFocus />
                      <button type="button" className="password-toggle" onClick={() => setShowLoginPwd((p) => !p)} aria-label={showLoginPwd ? 'Hide' : 'Show'}><Icon name={showLoginPwd ? 'eye-off' : 'eye'} /></button>
                    </div>
                  </label>
                  <label className="auth-field">
                    <span>Confirm Password</span>
                    <div className="password-input-shell">
                      <input type={showLoginPwd ? 'text' : 'password'} value={resetConfirmPwd} onChange={(e) => setResetConfirmPwd(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleResetPassword(tokenId, token, purpose); }}
                        placeholder="Repeat password" autoComplete="new-password" />
                    </div>
                  </label>
                  <button className="primary-button" type="button" disabled={resetLoading} style={{ width: '100%' }} onClick={() => void handleResetPassword(tokenId, token, purpose)}>
                    {resetLoading ? 'Saving…' : title}
                  </button>
                </>
              )}
              <button className="auth-link-btn" type="button" onClick={() => navigate('/login', { replace: true })}>Back to sign in</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Auth gate — show login if no active session ──────────────────────────

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">WealthTrack</div>
          <h2 className="auth-title">Sign in to your account</h2>
          {loginError && <p className="auth-error">{loginError}</p>}
          <label className="auth-field">
            <span>Email address</span>
            <input type="email" autoFocus value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Tab') return; if (e.key === 'Enter') void handleLogin(); }}
              placeholder="you@company.com" autoComplete="email" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <div className="password-input-shell">
              <input type={showLoginPwd ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin(); }}
                placeholder="Enter your password" autoComplete="current-password" />
              <button type="button" className="password-toggle" onClick={() => setShowLoginPwd((p) => !p)} aria-label={showLoginPwd ? 'Hide' : 'Show'}><Icon name={showLoginPwd ? 'eye-off' : 'eye'} /></button>
            </div>
          </label>
          <button className="primary-button" type="button" disabled={loginLoading} style={{ width: '100%' }} onClick={() => void handleLogin()}>
            {loginLoading ? 'Signing in…' : 'Sign in'}
          </button>
          <button className="auth-link-btn" type="button" onClick={() => { setLoginError(''); navigate('/forgot-password'); }}>
            Forgot your password?
          </button>
        </div>
      </div>
    );
  }

  if (isLoggedOut) {
    return (
      <div className="error-boundary-fallback" role="main">
        <div className="error-boundary-card">
          <h2>You've been signed out</h2>
          <p>Your session has ended. Sign back in to continue where you left off.</p>
          <div className="error-boundary-actions">
            <button type="button" className="primary-button" onClick={() => setIsLoggedOut(false)}>
              Sign in again
            </button>
          </div>
        </div>
      </div>
    );
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
          {navigationSections
            .map((section) => ({
              ...section,
              items: section.items.filter((item) => item.view !== 'users' || canManageTeam),
            }))
            .filter((section) => section.items.length > 0)
            .map((section) => {
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
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-trigger" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Icon name="grid" />
            </button>
            <strong>WealthTrack</strong>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Search">
              <Icon name="search" />
            </button>
            <button className="icon-button" type="button" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              <Icon name={isDark ? 'sun' : 'moon'} />
            </button>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Icon name="bell" />
            </button>

            <button
              className="user-chip"
              type="button"
              onClick={() => openDialog({
                title: 'Sign out',
                description: 'You will be signed out of the dashboard.',
                confirmLabel: 'Sign out',
                tone: 'default',
                onConfirm: handleLogout,
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
          <header className="page-title-row" aria-label={`${currentDefinition.heroTitle} page header`} style={{ display: detailRoute !== null ? 'none' : undefined }}>
            <div className="page-title-info">
              <h1 className="page-title">{currentDefinition.heroTitle}</h1>
            </div>
          </header>

          {notice ? (
            <div className={`feedback-banner feedback-${notice.tone}`} role="status">
              <span>{notice.message}</span>
              <button
                type="button"
                className="feedback-banner-close"
                onClick={() => setNotice(null)}
                aria-label="Dismiss"
              >×</button>
            </div>
          ) : null}
          {currentView !== 'reports' && currentLoadState.status === 'error' ? <div className="feedback-banner feedback-warn">Live data is unavailable for this tab: {currentLoadState.error}</div> : null}

          {detailRoute !== null ? (
            detailRoute.kind === 'customer' ? renderCustomerDetailPage(detailRoute.data) :
            detailRoute.kind === 'investment' ? renderInvestmentDetailPage(detailRoute.data) :
            renderManagerDetailPage(detailRoute.data)
          ) : currentView === 'reports' ? renderReportsOverview() : currentView === 'users' ? renderUsersPage() : currentView === 'settings' ? renderSettingsPage() : currentView === 'uploads' ? renderUploadsPage() : currentView === 'summary' ? renderSummaryPage() : (
            <>
              {currentView === 'portfolio' || currentView === 'wealth-managers' || currentView === 'commissions' || currentView === 'investments' || currentView === 'trends' ? null : (
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

                  <div className="toolbar-filter-block">
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
                  ) : currentView === 'commissions' ? (
                    renderCommissionsPage()
                  ) : currentView === 'trends' ? (
                    renderTrends()
                  ) : (
                    <>
                      <section className="panel table-panel">
                        <div className="panel-header">
                          <div>
                            <h3>{currentDefinition.title}</h3>
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
                            <h4>{emptyStateCopyByView[currentDefinition.id].title}</h4>
                            <p>{emptyStateCopyByView[currentDefinition.id].description}</p>
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

      {renderCustomerDrawer()}
      {renderInvestmentDrawer()}
      {renderManagerDrawer()}
      {renderReportDrawer()}

      {showIdleWarning ? (
        <div className="dialog-scrim" role="presentation">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="idle-warning-title">
            <div className="dialog-header">
              <h3 id="idle-warning-title">Still there?</h3>
            </div>
            <p className="dialog-copy">
              You've been inactive for a while. You'll be signed out in 5 minutes unless you continue.
            </p>
            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={handleLogout}>
                Sign out now
              </button>
              <button className="primary-button" type="button" onClick={() => setShowIdleWarning(false)}>
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogIntent ? (
        <div className="dialog-scrim" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="dialog-header">
              <div>
                <h3 id="dialog-title">{dialogIntent.title}</h3>
              </div>
              <button className="icon-button" type="button" aria-label="Close dialog" onClick={() => setDialogIntent(null)} disabled={isDialogBusy}>
                <Icon name="x" />
              </button>
            </div>

            <p className="dialog-copy">{dialogIntent.description}</p>



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
