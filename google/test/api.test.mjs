import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dispatch} from '../api.ts';
const calls=[];
const config={accounts:[{name:'personal',email:'user@example.test',cutoff:1000}],sheets:[{id:'sheet1',alias:'tracker',account:'personal'}]};
const fake={
 gmail:async (_account, method, path, body)=>{calls.push({method,path,body}); if(path.includes('/messages/')) return {id:'m',internalDate:'999',payload:{headers:[]}}; return {};},
 sheetRead:async()=>[['x']],
 sheetWrite:async()=>{throw Error('unexpected write');},
};
test('old mail and unrecognized actions are denied',async()=>{
 await assert.rejects(dispatch(config,fake,'/gmail/read',{account:'personal',message_id:'m'}));
 await assert.rejects(dispatch(config,fake,'/gmail/list',{account:'personal',max_results:2,q:'after:0'}));
 await assert.rejects(dispatch(config,fake,'/gmail/send',{account:'personal'}));
});
test('label and sheet access deny out-of-policy requests',async()=>{
 await assert.rejects(dispatch(config,fake,'/gmail/label',{account:'personal',message_id:'m',label:'INBOX'}));
 await assert.rejects(dispatch(config,fake,'/sheets/read',{spreadsheet_id:'other',range:'T!A1:A1'}));
});
test('draft creates only valid MIME draft, without a send action',async()=>{
 const calls=[];const t={...fake,gmail:async (_a,method,path,body)=>{calls.push({method,path,body});return {id:'draft1'};}};
 const result=await dispatch(config,t,'/gmail/draft',{account:'personal',to:['a@example.com'],cc:['b@example.com'],subject:'Hello',text:'Body'});
 assert.equal(result.draft_id,'draft1');assert.equal(calls[0].path,'/drafts');
 const mime=Buffer.from(calls[0].body.message.raw,'base64url').toString();
 assert.match(mime,/^To: a@example.com\r\nCc: b@example.com\r\nSubject:/);assert.match(mime,/Content-Transfer-Encoding: base64/);assert.match(mime,/Qm9keQ==/);
});
test('label mutation only adds an existing user label',async()=>{
 const calls=[];const t={...fake,gmail:async (_a,method,path,body)=>{calls.push({method,path,body});if(path.includes('/messages/m?'))return {internalDate:'1000',payload:{headers:[]}};if(path==='/labels')return {labels:[{name:'Hermes/action',type:'user',id:'Label_1'}]};return {};}};
 await dispatch(config,t,'/gmail/label',{account:'personal',message_id:'m',label:'Hermes/action'});
 assert.deepEqual(calls.at(-1).body,{addLabelIds:['Label_1']});
});
test('old metadata is rejected before requesting message body',async()=>{
 const seen=[];const t={...fake,gmail:async (_a,_m,path)=>{seen.push(path);return {internalDate:'999'};}};
 await assert.rejects(dispatch(config,t,'/gmail/read',{account:'personal',message_id:'m'}));
 assert.deepEqual(seen,['/messages/m?format=metadata&fields=internalDate%2ClabelIds']);
});
test('opaque paging tokens are encoded, not interpreted as a query',async()=>{
 let path='';const t={...fake,gmail:async (_a,_m,p)=>{path=p;return {messages:[]};}};
 await dispatch(config,t,'/gmail/list',{account:'personal',max_results:3,page_token:'ab+/='});
 assert.match(path,/pageToken=ab%2B%2F%3D/);
});
test('50 message list requests metadata only',async()=>{
 const calls=[];const t={...fake,gmail:async(_a,_m,path)=>{calls.push(path);return path.startsWith('/messages?')?{messages:Array.from({length:50},(_,i)=>({id:`m${i}`}))}:{internalDate:'1000',labelIds:[]};}};
 const result=await dispatch(config,t,'/gmail/list',{account:'personal',max_results:50});assert.equal(result.message_ids.length,50);assert.equal(calls.filter(p=>p.includes('format=full')).length,0);assert.equal(calls.length,51);
});
test('Cyrillic subject uses bounded encoded words and valid folding',async()=>{
 let body;const t={...fake,gmail:async(_a,_m,_p,b)=>{body=b;return {id:'draft1'};}};const subject='Пожалуйста проверьте важный ежемесячный платёж и уведомление';
 await dispatch(config,t,'/gmail/draft',{account:'personal',to:['a@example.com'],subject,text:'text'});const mime=Buffer.from(body.message.raw,'base64url').toString();const header=mime.match(/Subject: ([^\r\n]*(?:\r\n [^\r\n]*)*)/)[1];const words=header.replace(/\r\n /g,' ').split(' ');assert.ok(words.every(w=>w.length<=75));assert.equal(words.map(w=>Buffer.from(w.slice(10,-2),'base64').toString()).join(''),subject);
});
test('sheet metadata requires allowlisted ID and exposes fixed fixture metadata',async()=>{
 let calls=0;const t={...fake,sheetMetadata:async()=>{calls++;return {properties:{title:'Fixture'},sheets:[{properties:{title:'Tracker',gridProperties:{rowCount:100,columnCount:5}}}]};}};
 await assert.rejects(dispatch(config,t,'/sheets/metadata',{spreadsheet_id:'other'}));assert.equal(calls,0);
 const result=await dispatch(config,t,'/sheets/metadata',{spreadsheet_id:'sheet1'});assert.equal(result.sheets[0].properties.title,'Tracker');assert.equal(calls,1);
});
