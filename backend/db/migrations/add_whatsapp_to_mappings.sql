-- Add WhatsApp support to channel_mappings table
ALTER TABLE channel_mappings 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Add columns to teams_messages for WhatsApp forwarding
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS forwarded_to_whatsapp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forwarded_to_whatsapp_at TIMESTAMPTZ;

-- Create index for faster WhatsApp lookups
CREATE INDEX IF NOT EXISTS idx_channel_mappings_whatsapp ON channel_mappings(whatsapp_number);

COMMENT ON COLUMN channel_mappings.whatsapp_number IS 'WhatsApp number/group to forward messages to (format: +919876543210)';
