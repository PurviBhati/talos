-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  sender VARCHAR(255) NOT NULL,
  sender_phone VARCHAR(50) NOT NULL,
  body TEXT,
  message_sid VARCHAR(100) UNIQUE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  media_urls JSONB DEFAULT '[]',
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  forwarded_to_teams BOOLEAN DEFAULT FALSE,
  forwarded_to_slack BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  ai_category VARCHAR(100),
  ai_should_forward BOOLEAN,
  ai_priority VARCHAR(20),
  ai_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sender_phone ON whatsapp_messages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_direction ON whatsapp_messages(direction);

-- Add whatsapp_number column to contacts table if it doesn't exist
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

COMMENT ON TABLE whatsapp_messages IS 'Stores incoming and outgoing WhatsApp messages via Twilio';
