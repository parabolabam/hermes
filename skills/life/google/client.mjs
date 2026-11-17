#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const posts=new Set(['/gmail/list','/gmail/read','/gmail/label','/gmail/draft','/sheets/metadata','/sheets/read','/sheets/write']);
const mutations=new Set(['/gmail/label','/gmail/draft','/sheets/write']);
export function outcomeMessage(path){return mutations.has(path)?'Outcome unknown: the operation may have started. Do not automatically retry; check the draft, label or sheet and audit before taking further action.':'Connector unavailable or invalid request.';}
async function main(){
 const path=process.argv[2];
 if(path!=='/accounts'&&!posts.has(path)){process.stderr.write('Usage: client.mjs /accounts or POST route (JSON on stdin)\n');process.exitCode=2;return;}
 try {
  const key=(await readFile('/run/secrets/life-api-key','utf8')).trim();
  const headers={Authorization:`Bearer ${key}`};let body;
  if(posts.has(path)){const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);body=Buffer.concat(chunks).toString('utf8');JSON.parse(body);headers['content-type']='application/json';}
  const host=process.env.HERMES_GOOGLE_HOST??'google-connectors';
  if(!['google-connectors','google-connectors.railway.internal'].includes(host))throw Error('Invalid connector host');
  const response=await fetch(`http://${host}:8787${path}`,{method:body===undefined?'GET':'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(20000)});
  const result=await response.text();if(!response.ok&&mutations.has(path)&&![401,404,413,415].includes(response.status))process.stderr.write(outcomeMessage(path)+'\n');
  process.stdout.write(result+'\n');if(!response.ok)process.exitCode=1;
 }catch{process.stderr.write(outcomeMessage(path)+'\n');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
