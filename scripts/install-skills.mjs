import {copyFileSync, chmodSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const info = path => lstatSync(path, {throwIfNoEntry: false});

export function installSkills(source, destination, {overwrite = true, own = () => {}} = {}) {
  const directory = path => {
    const existing = info(path);
    if (!existing) mkdirSync(path);
    else if (!existing.isDirectory()) throw Error(`Unsafe skill path: ${path}`);
  };
  const install = (from, to) => {
    const entry = lstatSync(from);
    if (entry.isDirectory()) {
      directory(to);
      own(to);
      for (const child of readdirSync(from)) install(join(from, child), join(to, child));
    } else if (entry.isFile()) {
      const existing = info(to);
      if (existing && !existing.isFile()) throw Error(`Unsafe skill path: ${to}`);
      // Prepare on the same filesystem, then replace the entry rather than writing through it.
      const temporary = mkdtempSync(join(dirname(to), '.install-'));
      try {
        const replacement = join(temporary, basename(from));
        copyFileSync(from, replacement);
        chmodSync(replacement, entry.mode & 0o777);
        own(replacement);
        renameSync(replacement, to);
      } finally {
        rmSync(temporary, {recursive: true, force: true});
      }
    } else {
      throw Error(`Unsafe skill path: ${from}`);
    }
  };

  directory(destination);
  own(destination);
  for (const entry of readdirSync(source, {withFileTypes: true})) {
    if (entry.name.startsWith('.') || !entry.isDirectory()) continue;
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (!info(join(from, 'SKILL.md'))?.isFile() || (!overwrite && info(to))) continue;
    install(from, to);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [source, destination, mode] = process.argv.slice(2);
  installSkills(source, destination, {overwrite: mode !== '--skip-existing'});
}
