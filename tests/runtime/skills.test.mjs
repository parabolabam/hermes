import assert from 'node:assert/strict';
import {linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

async function fixture(t) {
  const {installSkills} = await import('../../scripts/install-skills.mjs');
  const root = mkdtempSync(join(tmpdir(), 'hermes-skills-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const file = (path, text) => {
    mkdirSync(join(root, path, '..'), {recursive: true});
    writeFileSync(join(root, path), text);
  };
  return {file, root, install: options => installSkills(join(root, 'repo/coding'), join(root, 'runtime'), options)};
}

test('installs each package for the selected role and preserves unrelated runtime skills', async t => {
  const {file, root, install} = await fixture(t);
  file('repo/coding/workflow/SKILL.md', 'reviewed workflow');
  file('repo/coding/new-skill/SKILL.md', 'reviewed new skill');
  file('repo/coding/new-skill/references/example.md', 'synthetic example');
  file('repo/coding/README.md', 'not a package');
  file('repo/life/google/SKILL.md', 'life only');
  file('runtime/workflow/SKILL.md', 'old workflow');
  file('runtime/private-skill/SKILL.md', 'private');
  install();
  const read = path => readFileSync(join(root, path), 'utf8');
  assert.equal(read('runtime/workflow/SKILL.md'), 'reviewed workflow');
  assert.equal(read('runtime/new-skill/SKILL.md'), 'reviewed new skill');
  assert.equal(read('runtime/new-skill/references/example.md'), 'synthetic example');
  assert.equal(read('runtime/private-skill/SKILL.md'), 'private');
  assert.throws(() => read('runtime/README.md'), {code: 'ENOENT'});
  assert.throws(() => read('runtime/google/SKILL.md'), {code: 'ENOENT'});
});

test('initialization skips existing skill packages', async t => {
  const {file, root, install} = await fixture(t);
  file('repo/coding/workflow/SKILL.md', 'reviewed workflow');
  file('runtime/workflow/SKILL.md', 'local edit');
  install({overwrite: false});
  assert.equal(readFileSync(join(root, 'runtime/workflow/SKILL.md'), 'utf8'), 'local edit');
});

test('does not follow links when updating a runtime package', async t => {
  const {file, root, install} = await fixture(t);
  file('repo/coding/workflow/SKILL.md', 'reviewed workflow');
  file('outside/SKILL.md', 'keep me');
  mkdirSync(join(root, 'runtime'));
  symlinkSync(join(root, 'outside'), join(root, 'runtime/workflow'));
  assert.throws(() => install(), /unsafe skill path/i);
  assert.equal(readFileSync(join(root, 'outside/SKILL.md'), 'utf8'), 'keep me');
});

test('updating a hard-linked file leaves its other name untouched', async t => {
  const {file, root, install} = await fixture(t);
  file('repo/coding/workflow/SKILL.md', 'reviewed workflow');
  file('outside/SKILL.md', 'keep me');
  mkdirSync(join(root, 'runtime/workflow'), {recursive: true});
  linkSync(join(root, 'outside/SKILL.md'), join(root, 'runtime/workflow/SKILL.md'));
  install();
  assert.equal(readFileSync(join(root, 'outside/SKILL.md'), 'utf8'), 'keep me');
  assert.equal(readFileSync(join(root, 'runtime/workflow/SKILL.md'), 'utf8'), 'reviewed workflow');
});

test('failed preparation leaves the previous file in place', async t => {
  const {file, root, install} = await fixture(t);
  file('repo/coding/workflow/SKILL.md', 'reviewed workflow');
  file('runtime/workflow/SKILL.md', 'old workflow');
  const own = path => {
    if (path.endsWith('/SKILL.md')) throw Error('simulated ownership failure');
  };
  assert.throws(() => install({own}), /simulated ownership failure/);
  assert.equal(readFileSync(join(root, 'runtime/workflow/SKILL.md'), 'utf8'), 'old workflow');
});
