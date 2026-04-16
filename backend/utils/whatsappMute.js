function normalizeName(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getMutedSenderIds() {
  return String(process.env.MUTE_WHATSAPP_SENDER_IDS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isMutedSenderForGroup(senderName = '', _groupName = '', senderId = '') {
  const senderNorm = normalizeName(senderName);
  const senderIdNorm = String(senderId || '').toLowerCase().trim();
  const mutedIds = getMutedSenderIds();

  const mayurVariants = [
    'mayurbhaia',
    'mayursingh',
    'mayur',
  ];
  const parthVariants = [
    'parthparmar',
    'parth',
  ];

  const isTargetSender =
    mayurVariants.some((name) => senderNorm === name || senderNorm.includes(name)) ||
    parthVariants.some((name) => senderNorm === name || senderNorm.includes(name));

  const isMutedById = mutedIds.some((id) => senderIdNorm.includes(id));

  return isTargetSender || isMutedById;
}
