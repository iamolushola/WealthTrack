-- ─────────────────────────────────────────────────────────────────────────────
-- 0018 · Clean permission descriptions
--
-- Problem: several permission descriptions used "and" to describe two distinct
-- capabilities in a single string, making each permission appear combined.
-- Every permission must describe exactly ONE capability so the permission matrix
-- is unambiguous to non-technical administrators.
--
-- Changes: update description text only — no codes, roles, or assignments change.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Team Management ──────────────────────────────────────────────────────────

UPDATE permissions SET description = 'View team members'
  WHERE code = 'users.read';

UPDATE permissions SET description = 'Edit team member profiles'
  WHERE code = 'users.update';

-- ── Analytics & Dashboards ───────────────────────────────────────────────────

UPDATE permissions SET description = 'View the Overview dashboard'
  WHERE code = 'dashboard.summary.read';

UPDATE permissions SET description = 'View the Trends dashboard'
  WHERE code = 'dashboard.trends.read';

UPDATE permissions SET description = 'View the Customers tab'
  WHERE code = 'dashboard.customers.read';

UPDATE permissions SET description = 'View the Investments tab'
  WHERE code = 'dashboard.investments.read';

UPDATE permissions SET description = 'View the Managers tab'
  WHERE code = 'dashboard.managers.read';

UPDATE permissions SET description = 'View the Commissions tab'
  WHERE code = 'dashboard.commissions.read';

-- ── Uploads ──────────────────────────────────────────────────────────────────

UPDATE permissions SET description = 'Preview upload validation results'
  WHERE code = 'uploads.preview.read';

-- ── Role Management ───────────────────────────────────────────────────────────

UPDATE permissions SET description = 'Manage role permissions'
  WHERE code = 'roles.manage';

-- ── Integrations ─────────────────────────────────────────────────────────────

UPDATE permissions SET description = 'View integration sync logs'
  WHERE code = 'integrations.logs.read';

-- ── Audit ─────────────────────────────────────────────────────────────────────

UPDATE permissions SET description = 'View the activity audit log'
  WHERE code = 'audit.logs.read';
