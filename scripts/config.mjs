#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { privateTelegram } from '../google/telegram.ts';

const [action, role, model] = process.argv.slice(2);
if (!['life', 'coding'].includes(role)) throw new Error('Invalid role');
const path = `.runtime/${role}/config.yaml`;
const canonical = `model:
  provider: openai-codex
  default: "MODEL"
fallback_providers: []
auth:
  adopt_external_logins: false
  codex_login_flow: device_code
delegation:
  provider: openai-codex
  fallback_providers: []
auxiliary:
  compression:
    provider: main
    fallback_chain: []
  title_generation:
    provider: main
    fallback_chain: []
  session_search:
    provider: main
    fallback_chain: []
  vision:
    provider: main
    fallback_chain: []
  background_review:
    provider: main
    fallback_chain: []
cron:
  model_provider: openai-codex
  mirror_delivery: true
database:
  journal_mode: delete
`;
const input = readFileSync(path, 'utf8');
// Hermes may add its migration marker; allow the user-selected reasoning setting only.
const marker = input.includes('_config_version: 53\n') ? '_config_version: 53\n' : '';
const reasoning = input.includes('agent:\n  reasoning_effort: medium\n') ? 'agent:\n  reasoning_effort: medium\n' : '';
const normalized = input.replace(marker, '').replace(reasoning, '');
const match = normalized.match(/^  default: "([A-Za-z0-9][A-Za-z0-9._:/-]*)"$/m);
const blank = normalized.includes('  default: ""\n');
const current = match?.[1] ?? (blank ? '' : null);
if (current === null || normalized !== canonical.replace('MODEL', current)) {
  throw new Error(`${role}: runtime config differs from approved policy; resolve before activation`);
}
if (action === 'model') {
  if (!model || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model)) throw new Error('Invalid model');
  writeFileSync(path, canonical.replace('MODEL', model) + marker + reasoning, { mode: 0o600 });
} else if (action === 'policy') {
  // Shape checked above, even before model selection.
} else if (action === 'validate') {
  if (!current) throw new Error(`${role}: select a model first`);
  const checkEnv = (path, allowed) => {
    const entries = readFileSync(path, 'utf8').trim().split(/\r?\n/);
    const found = new Set();
    for (const entry of entries) {
      const match = entry.match(/^([A-Z_]+)=([A-Za-z0-9_,:-]+)$/);
      if (!match || !allowed.includes(match[1]) || found.has(match[1])) throw new Error('Invalid activation environment');
      found.add(match[1]);
    }
    if (found.size !== allowed.length) throw new Error('Missing activation environment');
  };
  checkEnv('.runtime/host.env', ['HERMES_UID', 'HERMES_GID']);
  const telegramPath = `.runtime/${role}/telegram.env`;
  checkEnv(telegramPath, ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_USERS', 'TELEGRAM_HOME_CHANNEL']);
  const values=Object.fromEntries(readFileSync(telegramPath,'utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
  if (!privateTelegram(values.TELEGRAM_BOT_TOKEN,values.TELEGRAM_ALLOWED_USERS,values.TELEGRAM_HOME_CHANNEL)) throw new Error('Invalid private Telegram destination');
} else if (action === 'get-model') {
  if (!current) throw new Error('Select a model first');
  process.stdout.write(current);
} else throw new Error('Invalid action');
