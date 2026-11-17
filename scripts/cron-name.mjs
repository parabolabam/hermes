#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
const [path, name] = process.argv.slice(2);
if (!path || !name) process.exit(2);
if (!existsSync(path)) process.exit(1);
try {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const jobs = Array.isArray(data) ? data : data.jobs;
  if (!Array.isArray(jobs) || jobs.some(j => !j || typeof j !== 'object' || Array.isArray(j))) process.exit(2);
  const count = jobs.filter(j => j.name === name).length;
  process.exit(count > 1 ? 2 : count === 1 ? 0 : 1);
} catch { process.exit(2); }
