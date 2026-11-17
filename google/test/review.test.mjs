import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeSetupError} from '../errors.ts';
import {GrantSession} from '../grant-session.ts';
test('private parsing errors never enter operator output',()=>{assert.equal(safeSetupError(new Error('secret-marker')), 'Setup failed. Check the private configuration and try again.');});
test('pinned account and cutoff fail closed on replacement and cache token',async()=>{
 let current={name:'personal',email:'old@example.test',cutoff:100,generation:'one',refresh_token:'r1'};let exchanges=0;const session=new GrantSession(async()=>current,async()=>{exchanges++;return {access_token:'access1',expires_in:3600};});const original={...current};
 for(let i=0;i<50;i++)assert.equal(await session.token(original),'access1');assert.equal(exchanges,1);
 current={name:'personal',email:'new@example.test',cutoff:1000,generation:'two',refresh_token:'r2'};await assert.rejects(session.token(original));assert.equal(exchanges,1);
});
test('replacement during refresh cannot use or persist a new identity under old cutoff',async()=>{
 const old={name:'personal',email:'first@example.test',cutoff:100,generation:'first',refresh_token:'first-token'};const replacement={name:'personal',email:'second@example.test',cutoff:1000,generation:'second',refresh_token:'second-token'};let current=old;let release;let exchanged;const entered=new Promise(resolve=>{exchanged=resolve;});const pause=new Promise(resolve=>{release=resolve;});
 const session=new GrantSession(async()=>current,async token=>{if(token==='first-token'){exchanged();await pause;return {access_token:'old-access',expires_in:3600};}assert.equal(token,'second-token');return {access_token:'new-access',expires_in:3600};});
 const operation=session.token(old);await entered;current=replacement;release();await assert.rejects(operation);assert.equal(await session.token(replacement),'new-access');
});
test('malformed private input and upstream token JSON are sanitized in both output streams',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');const dir=await mkdtemp(join(tmpdir(),'hermes-redaction-'));const marker='SYNTHETIC_SECRET_MARKER';
 try{
  await writeFile(join(dir,'client.json'),`{"installed":{"client_secret":"${marker}`);
  await writeFile(join(dir,'config.json'),`{"secret":"${marker}`);
  await writeFile(join(dir,'journal.json'),`{"secret":"${marker}`);
  const code=`import {client,refresh} from './oauth.ts';import {readStore} from './store.ts';import {Journal} from './journal.ts';import {safeSetupError} from './errors.ts';import {writeFile} from 'node:fs/promises';const dir=process.argv[1];for(const task of [()=>client(dir),()=>readStore(dir),()=>Journal.open(dir,{})]){try{await task();}catch(e){console.log(safeSetupError(e));console.error(safeSetupError(e));}}await writeFile(dir+'/client.json',JSON.stringify({installed:{client_id:'fixture',client_secret:'fixture'}}));globalThis.fetch=async()=>new Response('{"token":"${marker}',{status:200});try{await refresh(dir,'fake');}catch(e){console.error(safeSetupError(e));}`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code,dir],{cwd:process.cwd(),encoding:'utf8'});assert.equal(result.status,0);assert.equal((result.stdout+result.stderr).includes(marker),false);assert.match(result.stderr,/Setup failed|Desktop OAuth/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
