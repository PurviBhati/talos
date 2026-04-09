-- Add group_name field to whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS group_name VARCHAR(255);

-- Create index for group_name
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_name ON whatsapp_messages(group_name);

COMMENT ON COLUMN whatsapp_messages.group_name IS 'WhatsApp group name where the message was sent/received';