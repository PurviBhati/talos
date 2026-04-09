-- Add dismissed column to whatsapp_messages table
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

-- Update existing messages to set group names for allowed groups
UPDATE whatsapp_messages 
SET group_name = CASE 
  WHEN sender LIKE '%Test grp%' OR body LIKE '%Test grp%' THEN 'Test grp'
  WHEN sender LIKE '%Appsrow%' OR body LIKE '%Appsrow%' OR sender LIKE '%demo%' THEN 'Appsrow - demo grp'
  ELSE group_name
END
WHERE group_name IS NULL;

-- Set dismissed = TRUE for messages from groups not in the allowed list
UPDATE whatsapp_messages 
SET dismissed = TRUE
WHERE group_name IS NOT NULL 
  AND group_name NOT IN ('Test grp', 'Appsrow - demo grp')
  AND (dismissed IS NULL OR dismissed = FALSE);