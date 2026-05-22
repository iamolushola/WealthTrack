-- Migration 0019: Ensure non-negative investment amount constraint exists
-- Brownfield fix: staging never had chk_investment_records_amount_positive so
-- migration 0015 was skipped entirely, leaving the non-negative constraint absent.
-- This migration adds it safely using a stored procedure to check first.

DROP PROCEDURE IF EXISTS wt_add_non_negative_constraint;

CREATE PROCEDURE wt_add_non_negative_constraint()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME        = 'investment_records'
      AND CONSTRAINT_NAME   = 'chk_investment_records_amount_non_negative'
  ) THEN
    ALTER TABLE investment_records
      ADD CONSTRAINT chk_investment_records_amount_non_negative
        CHECK (investment_amount >= 0);
  END IF;
END;

CALL wt_add_non_negative_constraint();

DROP PROCEDURE IF EXISTS wt_add_non_negative_constraint;
