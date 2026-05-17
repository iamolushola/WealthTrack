CREATE TABLE integration_sources (
    id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    source_type ENUM('api', 'database') NOT NULL,
    status ENUM('active', 'inactive', 'failed') NOT NULL DEFAULT 'inactive',
    secret_ref VARCHAR(255) NOT NULL,
    connection_config JSON NULL,
    field_mapping JSON NOT NULL,
    sync_frequency ENUM('manual', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'manual',
    last_tested_at DATETIME(3) NULL,
    last_successful_sync_at DATETIME(3) NULL,
    created_by CHAR(36) NOT NULL,
    updated_by CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_integration_sources_name (name),
    KEY idx_integration_sources_status_type (status, source_type),
    CONSTRAINT fk_integration_sources_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_integration_sources_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sync_batches (
    id CHAR(36) NOT NULL,
    integration_source_id CHAR(36) NOT NULL,
    triggered_by CHAR(36) NULL,
    source_type ENUM('api_sync', 'db_sync') NOT NULL,
    trigger_mode ENUM('manual', 'scheduled') NOT NULL,
    status ENUM('pending', 'running', 'success', 'failed', 'partial_success') NOT NULL DEFAULT 'pending',
    total_records INT NOT NULL DEFAULT 0,
    valid_records INT NOT NULL DEFAULT 0,
    invalid_records INT NOT NULL DEFAULT 0,
    duplicate_records INT NOT NULL DEFAULT 0,
    skipped_records INT NOT NULL DEFAULT 0,
    request_id VARCHAR(100) NULL,
    correlation_id VARCHAR(100) NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at DATETIME(3) NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_sync_batches_integration_status_started_at (integration_source_id, status, started_at),
    KEY idx_sync_batches_triggered_by_started_at (triggered_by, started_at),
    CONSTRAINT fk_sync_batches_integration_source_id FOREIGN KEY (integration_source_id) REFERENCES integration_sources (id),
    CONSTRAINT fk_sync_batches_triggered_by FOREIGN KEY (triggered_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sync_batch_errors (
    id CHAR(36) NOT NULL,
    sync_batch_id CHAR(36) NOT NULL,
    source_record_identifier VARCHAR(150) NULL,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    raw_payload_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_sync_batch_errors_sync_batch_id (sync_batch_id),
    CONSTRAINT fk_sync_batch_errors_sync_batch_id FOREIGN KEY (sync_batch_id) REFERENCES sync_batches (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE investment_records
    ADD CONSTRAINT fk_investment_records_sync_batch_id FOREIGN KEY (sync_batch_id) REFERENCES sync_batches (id);