-- backend/db/migrations/20260403_add_dashboard_columns.sql
-- Add analytics and decision columns for OpenClaw Dashboard

ALTER TABLE forward_logs 
ADD COLUMN IF NOT EXISTS ai_category TEXT,
ADD COLUMN IF NOT EXISTS ai_reason TEXT,
ADD COLUMN IF NOT EXISTS is_batched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';

COMMENT ON COLUMN forward_logs.ai_category IS 'Classification from OpenClaw (e.g. client_approval)';
COMMENT ON COLUMN forward_logs.ai_reason IS 'The explanation from the AI for its decision';
COMMENT ON COLUMN forward_logs.media_urls IS 'JSON array of images/files processed for this decision';
