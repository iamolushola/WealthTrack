CREATE TABLE system_settings (
    id CHAR(36) NOT NULL,
    setting_key VARCHAR(150) NOT NULL,
    setting_value_json JSON NOT NULL,
    description TEXT NULL,
    is_sensitive TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_system_settings_setting_key (setting_key),
    CONSTRAINT fk_system_settings_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tenor_bands (
    id CHAR(36) NOT NULL,
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    min_days INT NOT NULL,
    max_days INT NOT NULL,
    display_order INT NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tenor_bands_code (code),
    UNIQUE KEY uk_tenor_bands_display_order (display_order),
    CONSTRAINT chk_tenor_bands_range CHECK (min_days > 0 AND max_days >= min_days),
    CONSTRAINT fk_tenor_bands_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_tenor_bands_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE source_channels (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_source_channels_code (code),
    CONSTRAINT fk_source_channels_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_source_channels_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tenor_bands (id, code, label, min_days, max_days, display_order)
VALUES
    ('81111111-1111-7111-8111-111111111111', 'short_term', 'Short-Term', 30, 120, 1),
    ('82222222-2222-7222-8222-222222222222', 'mid_short_term', 'Mid-Short-Term', 150, 210, 2),
    ('83333333-3333-7333-8333-333333333333', 'medium_term', 'Medium-Term', 240, 360, 3),
    ('84444444-4444-7444-8444-444444444444', 'long_term', 'Long-Term', 390, 480, 4);

INSERT INTO source_channels (id, code, name, description)
VALUES
    ('85111111-1111-7111-8111-111111111111', 'branch', 'Branch', 'Branch-sourced investment record'),
    ('85222222-2222-7222-8222-222222222222', 'online', 'Online', 'Digital or online sourced record'),
    ('85333333-3333-7333-8333-333333333333', 'agent', 'Agent', 'Agent sourced investment record'),
    ('85444444-4444-7444-8444-444444444444', 'referral', 'Referral', 'Referral sourced investment record');