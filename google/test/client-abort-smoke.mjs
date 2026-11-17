import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
await mkdir('/run/secrets',{recursive:true});await writeFile('/run/secrets/life-api-key','synthetic-bearer-key-never-output');
await writeFile('/tmp/fixture-abort-preload.mjs',"globalThis.fetch=async()=>{throw new DOMException('synthetic abort','AbortError')};");
for(const route of ['/gmail/draft','/sheets/write']){
 const result=spawnSync(process.execPath,['--import','/tmp/fixture-abort-preload.mjs','/work/skills/life/google/client.mjs',route],{input:'{}',encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/Outcome unknown/i);assert.match(result.stderr,/Do not automatically retry/i);assert.doesNotMatch(result.stdout+result.stderr,/synthetic-bearer-key/);
}
process.stdout.write('Draft and sheet aborts report unknown without automatic retry.\n');
