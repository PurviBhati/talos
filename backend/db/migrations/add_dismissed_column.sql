-- Add dismissed column to track dismissed messages
ALTER TABLE slack_messages 
ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

ALTER TABLE teams_messages 
ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_slack_dismissed ON slack_messages(dismissed);
CREATE INDEX IF NOT EXISTS idx_teams_dismissed ON teams_messages(dismissed);
CREATE INDEX IF NOT EXISTS idx_whatsapp_dismissed ON whatsapp_messages(dismissed);

COMMENT ON COLUMN slack_messages.dismissed IS 'True if user dismissed this message from dashboard';
COMMENT ON COLUMN teams_messages.dismissed IS 'True if user dismissed this message from dashboard';
COMMENT ON COLUMN whatsapp_messages.dismissed IS 'True if user dismissed this message from dashboard';
