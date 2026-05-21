-- Migration 0015: Allow zero-amount investment records
-- RollOver-only and commission entries legitimately have investment_amount = 0
ALTER TABLE investment_records
  DROP CONSTRAINT chk_investment_records_amount_positive;

ALTER TABLE investment_records
  ADD CONSTRAINT chk_investment_records_amount_non_negative
    CHECK (investment_amount >= 0);
