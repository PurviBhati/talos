-- Add dismissed column if it doesn't exist
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE;

-- Mark all messages from non-allowed groups as dismissed
UPDATE whatsapp_messages 
SET dismissed = TRUE
WHERE group_name IS NOT NULL 
  AND group_name NOT IN ('Test grp', 'Appsrow - demo grp')
  AND (dismissed IS NULL OR dismissed = FALSE);

-- Mark messages from senders that are not in allowed groups as dismissed
UPDATE whatsapp_messages 
SET dismissed = TRUE
WHERE sender IS NOT NULL 
  AND sender NOT IN ('Test grp', 'Appsrow - demo grp')
  AND sender NOT LIKE '%Test grp%' 
  AND sender NOT LIKE '%Appsrow%' 
  AND sender NOT LIKE '%demo%'
  AND (dismissed IS NULL OR dismissed = FALSE);

-- Update group names for existing messages that should be in allowed groups
UPDATE whatsapp_messages 
SET group_name = 'Test grp'
WHERE (sender LIKE '%Test grp%' OR body LIKE '%Test grp%')
  AND (group_name IS NULL OR group_name != 'Test grp');

UPDATE whatsapp_messages 
SET group_name = 'Appsrow - demo grp'
WHERE (sender LIKE '%Appsrow%' OR sender LIKE '%demo%' OR body LIKE '%Appsrow%' OR body LIKE '%demo%')
  AND (group_name IS NULL OR group_name != 'Appsrow - demo grp');