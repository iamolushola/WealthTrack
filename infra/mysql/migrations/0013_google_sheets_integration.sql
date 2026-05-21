-- Extend integration_sources to support google_sheets source type
ALTER TABLE integration_sources
  MODIFY COLUMN source_type ENUM('api', 'database', 'google_sheets') NOT NULL;

-- Extend investment_records to tag google_sheets as a data source
ALTER TABLE investment_records
  MODIFY COLUMN data_source ENUM('csv_upload', 'api_sync', 'db_sync', 'google_sheets') NOT NULL;

-- Track individual sheet tabs as first-class entities
CREATE TABLE google_sheet_tabs (
  id                    CHAR(36)      NOT NULL,
  integration_source_id CHAR(36)      NOT NULL,
  sheet_id              VARCHAR(100)  NOT NULL,
  sheet_title           VARCHAR(255)  NOT NULL,
  range_notation        VARCHAR(100)  NOT NULL DEFAULT 'A1:ZZ',
  column_mapping        JSON          NOT NULL,
  status                ENUM('active', 'ignored') NOT NULL DEFAULT 'active',
  last_synced_at        DATETIME(3)   NULL,
  last_row_count        INT           NULL,
  created_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_sheet_tab (integration_source_id, sheet_id),
  KEY idx_sheet_tabs_source_status (integration_source_id, status),
  CONSTRAINT fk_sheet_tabs_source FOREIGN KEY (integration_source_id)
    REFERENCES integration_sources (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track processed row fingerprints for idempotency
CREATE TABLE google_sheet_row_checksums (
  id                    CHAR(36)      NOT NULL,
  sheet_tab_id          CHAR(36)      NOT NULL,
  row_index             INT           NOT NULL,
  row_checksum          CHAR(64)      NOT NULL,
  investment_record_id  CHAR(36)      NULL,
  synced_at             DATETIME(3)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_row_checksum (sheet_tab_id, row_index),
  KEY idx_checksums_tab (sheet_tab_id),
  CONSTRAINT fk_checksums_tab FOREIGN KEY (sheet_tab_id)
    REFERENCES google_sheet_tabs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
