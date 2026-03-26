CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS families (
    family_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(family_id) ON DELETE
    SET NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nickname VARCHAR(100) NOT NULL,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
        birthday DATE,
        role VARCHAR(20) NOT NULL DEFAULT 'youth' CHECK (role IN ('guardian', 'gatekeeper', 'youth')),
        contact_phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE TABLE IF NOT EXISTS scan_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    input_type VARCHAR(20) NOT NULL CHECK (
        input_type IN (
            'text',
            'image',
            'url',
            'phone',
            'video',
            'audio',
            'file'
        )
    ),
    input_content TEXT NOT NULL,
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_score INT CHECK (
        risk_score >= 0
        AND risk_score <= 100
    ),
    scam_type VARCHAR(100),
    summary TEXT,
    reason TEXT,
    consequence TEXT,
    risk_factors JSONB,
    top_signals JSONB,
    notify_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        notify_status IN ('pending', 'sent', 'not_required', 'failed')
    ),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE scan_events
ADD COLUMN IF NOT EXISTS scam_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS consequence TEXT,
    ADD COLUMN IF NOT EXISTS risk_factors JSONB,
    ADD COLUMN IF NOT EXISTS top_signals JSONB,
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE scan_events
ADD COLUMN IF NOT EXISTS s3_key TEXT;
CREATE INDEX IF NOT EXISTS idx_scan_events_user_id_created_at ON scan_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_events_risk_level ON scan_events(risk_level);