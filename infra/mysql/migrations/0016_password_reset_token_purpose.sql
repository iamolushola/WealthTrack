-- Migration 0016: Add purpose column to password_reset_tokens
-- Distinguishes token intent: forgot_password flow, new-admin onboarding, and
-- authenticated change-password OTP verification.

ALTER TABLE password_reset_tokens
  ADD COLUMN purpose ENUM('forgot_password', 'set_password', 'change_password')
    NOT NULL DEFAULT 'forgot_password'
    AFTER user_id;

-- Backfill existing rows (all were for password resets before this column existed)
UPDATE password_reset_tokens SET purpose = 'forgot_password' WHERE purpose = 'forgot_password';
