-- Migration 0014: Add 'importing' status to upload_batches
ALTER TABLE upload_batches
  MODIFY COLUMN status
    ENUM('pending','processing','validated','importing','failed','imported','partially_imported','cancelled')
    NOT NULL DEFAULT 'pending';
