-- Migration 0011: seed the dashboard actor user so /users/me resolves correctly
-- Actor ID matches the hardcoded x-actor-id header used by the dashboard shell

INSERT IGNORE INTO users (id, name, email, password_hash, role_id, status, created_at, updated_at)
VALUES (
  '44444444-4444-7444-8444-444444444444',
  'Victor Adeniyi',
  'victor.a@credpal.com',
  -- placeholder hash; password is 'changeme' (scrypt-derived)
  'placeholder:0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  '11111111-1111-7111-8111-111111111111',
  'active',
  UTC_TIMESTAMP(3),
  UTC_TIMESTAMP(3)
);
