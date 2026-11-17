import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validState} from '../oauth.ts';
test('OAuth state requires exact match',()=>{assert.equal(validState('secretstate','secretstate'),true);assert.equal(validState('secretstate','wrong'),false);assert.equal(validState('secretstate','secretstatf'),false);});
test('Desktop flow rejects wrong state and never prints tokens or client secret',async()=>{
 const {mkdtemp,writeFile,readFile,stat,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {get}=await import('node:http');const {authorize}=await import('../oauth.ts');
 const dir=await mkdtemp(join(tmpdir(),'hermes-oauth-'));const oldFetch=globalThis.fetch,oldWrite=process.stdout.write;let printed='';let resolveUrl;const printedUrl=new Promise(resolve=>{resolveUrl=resolve;});
 const request=url=>new Promise((resolve,reject)=>{get(url,res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);});
 try{
  await writeFile(join(dir,'client.json'),JSON.stringify({installed:{client_id:'fixture-id',client_secret:'fixture-client-secret'}}));
  globalThis.fetch=async url=>String(url).includes('oauth2.googleapis.com')?new Response(JSON.stringify({access_token:'fixture-access-secret',refresh_token:'fixture-refresh-secret'}),{status:200}):new Response(JSON.stringify({email:'fixture@example.test',email_verified:true}),{status:200});
  process.stdout.write=function(chunk,...args){printed+=String(chunk);const match=printed.match(/https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?\S+/);if(match)resolveUrl(match[0]);return true;};
  const operation=authorize(dir,'personal',false);const url=new URL(await printedUrl);const state=url.searchParams.get('state');
  assert.equal(await request('http://127.0.0.1:8765/?state=wrong&code=bad'),400);
  assert.equal(await request(`http://127.0.0.1:8765/?state=${encodeURIComponent(state)}&code=fixture-code`),200);
  await operation;const saved=JSON.parse(await readFile(join(dir,'config.json'),'utf8'));assert.equal(saved.accounts[0].email,'fixture@example.test');assert.equal((await stat(join(dir,'config.json'))).mode & 0o777,0o600);
  for(const value of ['fixture-client-secret','fixture-access-secret','fixture-refresh-secret','fixture-code'])assert.equal(printed.includes(value),false);
 }finally{process.stdout.write=oldWrite;globalThis.fetch=oldFetch;await rm(dir,{recursive:true,force:true});}
});
