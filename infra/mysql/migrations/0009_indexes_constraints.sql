CREATE INDEX idx_upload_validation_errors_error_code
    ON upload_validation_errors (error_code);

CREATE INDEX idx_report_exports_report_type_status
    ON report_exports (report_type, status, created_at);

CREATE INDEX idx_integration_sources_sync_frequency
    ON integration_sources (sync_frequency, status);

CREATE INDEX idx_sync_batches_status_started_at
    ON sync_batches (status, started_at);

CREATE INDEX idx_investment_records_customer_date
    ON investment_records (customer_id, mobilisation_date);

CREATE INDEX idx_investment_records_rm_date
    ON investment_records (relationship_manager, mobilisation_date);

CREATE INDEX idx_investment_records_source_channel_date
    ON investment_records (source_channel, mobilisation_date);

CREATE INDEX idx_investment_records_fund_tenor_date
    ON investment_records (fund_type, tenor_category, mobilisation_date);

CREATE INDEX idx_job_history_queue_status_created_at
    ON job_history (queue_name, status, created_at);

CREATE INDEX idx_audit_logs_created_at
    ON audit_logs (created_at);