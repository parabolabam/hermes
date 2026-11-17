#!/usr/bin/env node
// Read a token only from stdin; never emit request URLs, API errors, or message text.
let token = '';
for await (const chunk of process.stdin) token += chunk;
if (!/^[A-Za-z0-9_:-]+$/.test(token)) { console.error('Invalid token format.'); process.exit(1); }
try {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&timeout=0`, {signal: AbortSignal.timeout(15000)});
  const data = await response.json();
  if (!response.ok || data.ok !== true || !Array.isArray(data.result)) throw new Error('API request failed');
  const candidates = new Set();
  for (const update of data.result) {
    const msg = update.message;
    if (msg?.chat?.type !== 'private' || !Number.isSafeInteger(msg.from?.id) || !Number.isSafeInteger(msg.chat?.id)) continue;
    candidates.add(`User ID: ${msg.from.id}  Chat ID: ${msg.chat.id}`);
  }
  if (!candidates.size) console.log('No private-chat candidates. Start the bot and retry.');
  else for (const candidate of candidates) console.log(candidate);
} catch {
  console.error('Telegram lookup failed. Check the token, network, and that no other client is polling.');
  process.exit(1);
}
