-- ─────────────────────────────────────────────────────────────────────────────
-- 0017 · Atomic permission refactor
--
-- Problem: several permissions were "combined" — a single code controlled
-- access to two distinct platform tabs or feature areas.  With ~20 roles this
-- prevents precise access segmentation.
--
-- Changes:
--   • Split dashboard.customer_portfolio.read
--         → dashboard.customers.read   (Customers tab)
--         → dashboard.investments.read (Investments tab)
--
--   • Split dashboard.wealth_manager.read
--         → dashboard.managers.read    (Managers tab)
--         → dashboard.commissions.read (Commissions tab)
--
--   • Split settings.update (RBAC portion)
--         → roles.manage               (Create / edit / delete roles & permissions)
--         settings.update is retained for system config / classification rules
--
--   • All built-in role assignments updated to the new atomic codes.
--   • Old combined permission records deleted after re-assignment.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add the five new atomic permissions ───────────────────────────────────

INSERT IGNORE INTO permissions (id, code, description) VALUES
  ('10000000-0000-7000-8000-000000000024', 'dashboard.customers.read',   'View the Customers tab and individual customer portfolios'),
  ('10000000-0000-7000-8000-000000000025', 'dashboard.investments.read', 'View the Investments ledger and all transaction records'),
  ('10000000-0000-7000-8000-000000000026', 'dashboard.managers.read',    'View the Managers tab and relationship manager performance'),
  ('10000000-0000-7000-8000-000000000027', 'dashboard.commissions.read', 'View the Commissions tab and manager commission book'),
  ('10000000-0000-7000-8000-000000000028', 'roles.manage',               'Create, edit, and delete roles; adjust role permissions');

-- ── 2. super_admin — grant all five new permissions ───────────────────────────
-- (super_admin's original bulk INSERT only covered permissions that existed at
--  migration 0001 time; each subsequent new permission must be added manually)

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('a5000024-5555-7555-8555-555555555524', '55555555-5555-7555-8555-555555555555', '10000000-0000-7000-8000-000000000024'),
  ('a5000025-5555-7555-8555-555555555525', '55555555-5555-7555-8555-555555555555', '10000000-0000-7000-8000-000000000025'),
  ('a5000026-5555-7555-8555-555555555526', '55555555-5555-7555-8555-555555555555', '10000000-0000-7000-8000-000000000026'),
  ('a5000027-5555-7555-8555-555555555527', '55555555-5555-7555-8555-555555555555', '10000000-0000-7000-8000-000000000027'),
  ('a5000028-5555-7555-8555-555555555528', '55555555-5555-7555-8555-555555555555', '10000000-0000-7000-8000-000000000028');

-- ── 3. admin — grant all five new permissions ─────────────────────────────────

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('91111111-1111-7111-8111-111111111124', '11111111-1111-7111-8111-111111111111', '10000000-0000-7000-8000-000000000024'),
  ('91111111-1111-7111-8111-111111111125', '11111111-1111-7111-8111-111111111111', '10000000-0000-7000-8000-000000000025'),
  ('91111111-1111-7111-8111-111111111126', '11111111-1111-7111-8111-111111111111', '10000000-0000-7000-8000-000000000026'),
  ('91111111-1111-7111-8111-111111111127', '11111111-1111-7111-8111-111111111111', '10000000-0000-7000-8000-000000000027'),
  ('91111111-1111-7111-8111-111111111128', '11111111-1111-7111-8111-111111111111', '10000000-0000-7000-8000-000000000028');

-- ── 4. analyst — replace old combined codes with four new tab permissions ─────

DELETE FROM role_permissions
WHERE role_id = '22222222-2222-7222-8222-222222222222'
  AND permission_id IN (
    '10000000-0000-7000-8000-000000000012', -- dashboard.customer_portfolio.read
    '10000000-0000-7000-8000-000000000013'  -- dashboard.wealth_manager.read
  );

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('92222222-2222-7222-8222-222222222209', '22222222-2222-7222-8222-222222222222', '10000000-0000-7000-8000-000000000024'), -- dashboard.customers.read
  ('92222222-2222-7222-8222-222222222210', '22222222-2222-7222-8222-222222222222', '10000000-0000-7000-8000-000000000025'), -- dashboard.investments.read
  ('92222222-2222-7222-8222-222222222211', '22222222-2222-7222-8222-222222222222', '10000000-0000-7000-8000-000000000026'), -- dashboard.managers.read
  ('92222222-2222-7222-8222-222222222212', '22222222-2222-7222-8222-222222222222', '10000000-0000-7000-8000-000000000027'); -- dashboard.commissions.read

-- ── 5. ops_manager ────────────────────────────────────────────────────────────

DELETE FROM role_permissions
WHERE role_id = '66666666-6666-7666-8666-666666666666'
  AND permission_id IN (
    '10000000-0000-7000-8000-000000000012',
    '10000000-0000-7000-8000-000000000013'
  );

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('b6000014-6666-7666-8666-666666666614', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000024'),
  ('b6000015-6666-7666-8666-666666666615', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000025'),
  ('b6000016-6666-7666-8666-666666666616', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000026'),
  ('b6000017-6666-7666-8666-666666666617', '66666666-6666-7666-8666-666666666666', '10000000-0000-7000-8000-000000000027');

-- ── 6. compliance_officer ─────────────────────────────────────────────────────

DELETE FROM role_permissions
WHERE role_id = '77777777-7777-7777-8777-777777777777'
  AND permission_id IN (
    '10000000-0000-7000-8000-000000000012',
    '10000000-0000-7000-8000-000000000013'
  );

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('c7000009-7777-7777-8777-777777777709', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000024'),
  ('c7000010-7777-7777-8777-777777777710', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000025'),
  ('c7000011-7777-7777-8777-777777777711', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000026'),
  ('c7000012-7777-7777-8777-777777777712', '77777777-7777-7777-8777-777777777777', '10000000-0000-7000-8000-000000000027');

-- ── 7. viewer ─────────────────────────────────────────────────────────────────

DELETE FROM role_permissions
WHERE role_id = '88888888-8888-7888-8888-888888888888'
  AND permission_id IN (
    '10000000-0000-7000-8000-000000000012',
    '10000000-0000-7000-8000-000000000013'
  );

INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
  ('d8000006-8888-7888-8888-888888888806', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000024'),
  ('d8000007-8888-7888-8888-888888888807', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000025'),
  ('d8000008-8888-7888-8888-888888888808', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000026'),
  ('d8000009-8888-7888-8888-888888888809', '88888888-8888-7888-8888-888888888888', '10000000-0000-7000-8000-000000000027');

-- ── 8. Remove old combined permissions from ALL remaining role assignments ─────
-- This covers any custom roles created after the initial migrations that may
-- have been assigned these combined permissions via the UI.

DELETE FROM role_permissions
WHERE permission_id IN (
  '10000000-0000-7000-8000-000000000012', -- dashboard.customer_portfolio.read
  '10000000-0000-7000-8000-000000000013'  -- dashboard.wealth_manager.read
);

-- ── 9. Delete the old combined permission records ─────────────────────────────

DELETE FROM permissions
WHERE id IN (
  '10000000-0000-7000-8000-000000000012', -- dashboard.customer_portfolio.read
  '10000000-0000-7000-8000-000000000013'  -- dashboard.wealth_manager.read
);
