-- Add enhanced OpenClaw analysis fields to whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS content_summary TEXT,
ADD COLUMN IF NOT EXISTS action_required TEXT,
ADD COLUMN IF NOT EXISTS urgency_indicators TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_priority ON whatsapp_messages(ai_priority);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_should_forward ON whatsapp_messages(ai_should_forward);

COMMENT ON COLUMN whatsapp_messages.content_summary IS 'Brief summary of message content from OpenClaw analysis';
COMMENT ON COLUMN whatsapp_messages.action_required IS 'Action required based on OpenClaw analysis';
COMMENT ON COLUMN whatsapp_messages.urgency_indicators IS 'Urgency indicators detected by OpenClaw';