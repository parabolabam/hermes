import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createHandler} from '../http.ts';
import {dispatch} from '../api.ts';
import {outcomeMessage} from '../../skills/life/google/client.mjs';
function request(path,body){const r=Readable.from([JSON.stringify(body)]);r.url=path;r.method='POST';r.headers={'content-type':'application/json',authorization:'Bearer fixture'};return r;}
class Response extends EventEmitter {writableFinished=false;destroyed=false;status=0;writeHead(s){this.status=s;}end(){this.writableFinished=true;this.emit('finish');}disconnect(){this.destroyed=true;this.emit('close');}}
function queue(){let q=Promise.resolve();return fn=>{const next=q.then(fn);q=next.then(()=>{},()=>{});return next;};}
const config={accounts:[{name:'fixture',email:'fixture@example.test',cutoff:100}],sheets:[{id:'sheet',alias:'tracker',account:'fixture'}]};
function handlerFor(transport){return createHandler({authorized:()=>true,health:async()=>({}),accounts:async()=>({}),serial:queue(),dispatch:(path,body,active)=>dispatch(config,transport,path,body,active)});}
const draft={account:'fixture',to:['a@example.test'],subject:'hi',text:'body'};
test('disconnected queued draft never reaches Google while an alive request proceeds',async()=>{
 let release,started;const gate=new Promise(r=>{release=r;});const begun=new Promise(r=>{started=r;});let drafts=0;
 const transport={gmail:async(_a,_method,path)=>{if(path.startsWith('/messages?')){started();await gate;return {messages:[]};}if(path==='/drafts'){drafts++;return {id:'d1'};}throw Error('unexpected');},sheetMetadata:async()=>({}),sheetRead:async()=>[],sheetWrite:async()=>({})};
 const handler=handlerFor(transport);const a=new Response(),b=new Response(),c=new Response();const one=handler(request('/gmail/list',{account:'fixture',max_results:1}),a);await begun;const two=handler(request('/gmail/draft',draft),b);const three=handler(request('/sheets/metadata',{spreadsheet_id:'sheet'}),c);await new Promise(r=>setImmediate(r));b.disconnect();release();await Promise.all([one,two,three]);assert.equal(drafts,0);assert.equal(c.status,200);
});
test('disconnect during draft preparation prevents the later Google mutation',async()=>{
 let release,started;const gate=new Promise(r=>{release=r;});const begun=new Promise(r=>{started=r;});let drafts=0;
 const transport={gmail:async(_a,_method,path)=>{if(path.includes('format=metadata')){started();await gate;return {internalDate:'101'};}if(path.includes('format=full'))return {internalDate:'101',threadId:'thread1',payload:{headers:[{name:'Message-ID',value:'<id@example.test>'}]}};if(path==='/drafts'){drafts++;return {id:'d1'};}throw Error('unexpected');},sheetMetadata:async()=>({}),sheetRead:async()=>[],sheetWrite:async()=>({})};
 const response=new Response();const operation=handlerFor(transport)(request('/gmail/draft',{...draft,reply_to_message_id:'m1'}),response);await begun;response.disconnect();release();await operation;assert.equal(drafts,0);
});
test('disconnect after started draft or write yields unknown client guidance',async()=>{
 for(const path of ['/gmail/draft','/sheets/write']){
  let release,started;const gate=new Promise(r=>{release=r;});const begun=new Promise(r=>{started=r;});let calls=0;
  const mutation=async()=>{calls++;started();await gate;return {id:'d1'};};const transport={gmail:async()=>mutation(),sheetMetadata:async()=>({}),sheetRead:async()=>[],sheetWrite:mutation};
  const body=path==='/gmail/draft'?draft:{spreadsheet_id:'sheet',range:'T!A1:A1',expected_values:[['x']],values:[['y']],reason:'r',evidence:'e'};
  const response=new Response();const operation=handlerFor(transport)(request(path,body),response);await begun;response.disconnect();release();await operation;assert.equal(calls,1);assert.match(outcomeMessage(path),/unknown/i);assert.match(outcomeMessage(path),/do not automatically retry/i);
 }
});
test('real HTTP disconnect while queued cancels draft dispatch',async()=>{
 const {createServer,request:httpRequest}=await import('node:http');let release,started,queued,closed;const gate=new Promise(r=>{release=r;});const begun=new Promise(r=>{started=r;});const seen=new Promise(r=>{queued=r;});const disconnected=new Promise(r=>{closed=r;});let drafts=0,count=0;
 const transport={gmail:async(_a,_m,path)=>{if(path.startsWith('/messages?')){started();await gate;return {messages:[]};}if(path==='/drafts'){drafts++;return {id:'d1'};}throw Error('unexpected');},sheetMetadata:async()=>({}),sheetRead:async()=>[],sheetWrite:async()=>({})};const handler=handlerFor(transport);
 const server=createServer((req,res)=>{count++;if(count===2){req.on('end',queued);res.on('close',closed);}void handler(req,res);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 function send(path,body){const req=httpRequest({host:'127.0.0.1',port,path,method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'} });const response=new Promise((resolve,reject)=>{req.on('response',res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);});req.end(JSON.stringify(body));return {req,response};}
 try{const first=send('/gmail/list',{account:'fixture',max_results:1});await begun;const second=send('/gmail/draft',draft);second.response.catch(()=>{});await seen;second.req.destroy();await disconnected;const third=send('/sheets/metadata',{spreadsheet_id:'sheet'});release();assert.equal(await first.response,200);assert.equal(await third.response,200);assert.equal(drafts,0);}finally{server.close();}
});
