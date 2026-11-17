import { existsSync, readFileSync } from 'node:fs';
const path = process.argv[2] || '/opt/data/.env';
if (existsSync(path)) for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
  const entry = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (entry && entry[1] !== 'API_SERVER_KEY' && /(?:API.*(?:KEY|BASE)|BASE.*URL|PROVIDER)/i.test(entry[1]) && !['', '""', "''"].includes(entry[2])) {
    console.error('Remove provider, inference API key and endpoint overrides from the runtime environment.');
    process.exit(1);
  }
}
