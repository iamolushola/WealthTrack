-- ─────────────────────────────────────────────────────────────────────────────
-- 0012 · RBAC expansion
--   • Update all permission descriptions to plain, non-technical English
--   • Add four new built-in roles:
--       super_admin  – full platform control (mirrors admin, elevated intent)
--       ops_manager  – operations: uploads, imports, dashboards, reports, audit
--       compliance   – read-only compliance view: dashboards, reports, audit
--       viewer       – read-only dashboards only
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Plain-English permission descriptions ────────────────────────────────────

UPDATE permissions SET description = 'Sign in to the platform'
  WHERE code = 'auth.login';

UPDATE permissions SET description = 'Invite new team members'
  WHERE code = 'users.create';

UPDATE permissions SET description = 'View team members, roles, and permissions'
  WHERE code = 'users.read';

UPDATE permissions SET description = 'Edit team member profiles and role assignments'
  WHERE code = 'users.update';

UPDATE permissions SET description = 'Suspend or reactivate team member accounts'
  WHERE code = 'users.deactivate';

UPDATE permissions SET description = 'Upload new CSV data files'
  WHERE code = 'uploads.csv.create';

UPDATE permissions SET description = 'Preview uploaded files and see validation errors before importing'
  WHERE code = 'uploads.preview.read';

UPDATE permissions SET description = 'Approve or reject a pending file import'
  WHERE code = 'uploads.import.confirm';

UPDATE permissions SET description = 'View the history of all past uploads'
  WHERE code = 'uploads.history.read';

UPDATE permissions SET description = 'View the Overview dashboard and key performance metrics'
  WHERE code = 'dashboard.summary.read';

UPDATE permissions SET description = 'View the Trends dashboard and time-series charts'
  WHERE code = 'dashboard.trends.read';

UPDATE permissions SET description = 'View the Customers dashboard and individual portfolios'
  WHERE code = 'dashboard.customer_portfolio.read';

UPDATE permissions SET description = 'View the Managers dashboard and relationship manager metrics'
  WHERE code = 'dashboard.wealth_manager.read';

UPDATE permissions SET description = 'Generate and download data export reports'
  WHERE code = 'reports.export';

UPDATE permissions SET description = 'View connected data integration sources'
  WHERE code = 'integrations.read';

UPDATE permissions SET description = 'Add new data integration sources'
  WHERE code = 'integrations.create';

UPDATE permissions SET description = 'Edit existing data integration sources'
  WHERE code = 'integrations.update';

UPDATE permissions SET description = 'Remove data integration sources'
  WHERE code = 'integrations.delete';

UPDATE permissions SET description = 'Manually trigger a data synchronisation'
  WHERE code = 'integrations.sync.trigger';

UPDATE permissions SET description = 'View integration sync history and error logs'
  WHERE code = 'integrations.logs.read';

UPDATE permissions SET description = 'View the full activity audit log and export it'
  WHERE code = 'audit.logs.read';

UPDATE permissions SET description = 'Change system settings and data classification rules'
  WHERE code = 'settings.update';

UPDATE permissions SET description = 'Retry failed background jobs from the error queue'
  WHERE code = 'jobs.dlq.replay';

-- ── New roles ─────────────────────────────────────────────────────────────────

INSERT IGNORE INTO roles (id, code, name, description) VALUES
  ('55555555-5555-7555-8555-555555555555', 'super_admin',         'Super Administrator', 'Unrestricted access to every platform feature including system settings'),
  ('66666666-6666-7666-8666-666666666666', 'ops_manager',         'Operations Manager',  'Manages data uploads, imports, and can view all dashboards and reports'),
  ('77777777-7777-7777-8777-777777777777', 'compliance_officer',  'Compliance Officer',  'Read-only access to dashboards, reports, and the full audit log'),
  ('88888888-8888-7888-8888-888888888888', 'viewer',              'Viewer',              'Read-only access to dashboards — no data export or modifications');

-- ── Super Administrator — all 23 permissions ─────────────────────────────────

INSERT IGNORE INTO role_permissions (id, role_id, permission_id)
SELECT
  CONCAT('a5', LPAD(HEX(p.seq), 34, '0')),
  '55555555-5555-7555-8555-555555555555',
  p.id
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS seq
  FROM permissions
) p;

-- ── Operations Manager ────────────────────────────────────────────────────────
-- auth · uploads (all) · dashboard (all) · reports · integrations (read + logs) · audit

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('b6000001-6666-7666-8666-666666666601', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000001'), -- auth.login
  ('b6000002-6666-7666-8666-666666666602', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000006'), -- uploads.csv.create
  ('b6000003-6666-7666-8666-666666666603', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000007'), -- uploads.preview.read
  ('b6000004-6666-7666-8666-666666666604', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000008'), -- uploads.import.confirm
  ('b6000005-6666-7666-8666-666666666605', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000009'), -- uploads.history.read
  ('b6000006-6666-7666-8666-666666666606', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000010'), -- dashboard.summary.read
  ('b6000007-6666-7666-8666-666666666607', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000011'), -- dashboard.trends.read
  ('b6000008-6666-7666-8666-666666666608', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000012'), -- dashboard.customer_portfolio.read
  ('b6000009-6666-7666-8666-666666666609', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000013'), -- dashboard.wealth_manager.read
  ('b6000010-6666-7666-8666-666666666610', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000014'), -- reports.export
  ('b6000011-6666-7666-8666-666666666611', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000015'), -- integrations.read
  ('b6000012-6666-7666-8666-666666666612', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000020'), -- integrations.logs.read
  ('b6000013-6666-7666-8666-666666666613', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000021'); -- audit.logs.read

-- ── Compliance Officer ────────────────────────────────────────────────────────
-- auth · dashboard (all) · reports · uploads history (read-only) · audit

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('c7000001-7777-7777-8777-777777777701', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000001'), -- auth.login
  ('c7000002-7777-7777-8777-777777777702', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000009'), -- uploads.history.read
  ('c7000003-7777-7777-8777-777777777703', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000010'), -- dashboard.summary.read
  ('c7000004-7777-7777-8777-777777777704', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000011'), -- dashboard.trends.read
  ('c7000005-7777-7777-8777-777777777705', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000012'), -- dashboard.customer_portfolio.read
  ('c7000006-7777-7777-8777-777777777706', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000013'), -- dashboard.wealth_manager.read
  ('c7000007-7777-7777-8777-777777777707', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000014'), -- reports.export
  ('c7000008-7777-7777-8777-777777777708', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000021'); -- audit.logs.read

-- ── Viewer ────────────────────────────────────────────────────────────────────
-- auth · dashboard (all, read-only) — no exports, no uploads, no admin

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('d8000001-8888-7888-8888-888888888801', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000001'), -- auth.login
  ('d8000002-8888-7888-8888-888888888802', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000010'), -- dashboard.summary.read
  ('d8000003-8888-7888-8888-888888888803', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000011'), -- dashboard.trends.read
  ('d8000004-8888-7888-8888-888888888804', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000012'), -- dashboard.customer_portfolio.read
  ('d8000005-8888-7888-8888-888888888805', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000013'); -- dashboard.wealth_manager.read
