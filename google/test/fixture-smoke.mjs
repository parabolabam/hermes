import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('/fixture',{recursive:true});await mkdir('/run/secrets',{recursive:true});
const key='synthetic-fixture-key-0123456789abcdef';await writeFile('/run/secrets/life-api-key',key);await writeFile('/fixture/sheet.json','[["unpaid"]]');
const server=spawn(process.execPath,['/app/test/fixture-server.mjs'],{stdio:'ignore'});
try {
 let ready=false;for(let i=0;i<100;i++){try{const r=await fetch('http://127.0.0.1:8787/health');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready);
 const request=async(path,body)=>{const r=await fetch(`http://127.0.0.1:8787${path}`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
 const list=await request('/gmail/list',{account:'fixture',max_results:5});assert.deepEqual(list.message_ids,['new1']);
 const mail=await request('/gmail/read',{account:'fixture',message_id:'new1'});assert.match(mail.text,/paid/);
 await request('/gmail/label',{account:'fixture',message_id:'new1',label:'Hermes/action'});
 const labelled=await request('/gmail/read',{account:'fixture',message_id:'new1'});assert.deepEqual(labelled.label_ids,['Label_fixture']);
 const draft=await request('/gmail/draft',{account:'fixture',to:['fixture@example.test'],subject:'Reply',text:'Fixture reply',reply_to_message_id:'new1'});assert.match(draft.review_url,/^https:\/\/mail\.google\.com\//);
 const actions=(await readFile('/fixture/actions.jsonl','utf8')).trim().split('\n').map(JSON.parse);const created=actions.find(action=>action.path==='/drafts');assert.equal(created.body.message.threadId,'thread1');assert.match(Buffer.from(created.body.message.raw,'base64url').toString(),/In-Reply-To: <fixture-message@example.test>/);
 const metadata=await request('/sheets/metadata',{spreadsheet_id:'fixture_sheet_001'});assert.equal(metadata.sheets[0].properties.title,'Tracker');
 const read=await request('/sheets/read',{spreadsheet_id:'fixture_sheet_001',range:'Tracker!A1:A1'});assert.deepEqual(read.values,[['unpaid']]);
 const result=await request('/sheets/write',{spreadsheet_id:'fixture_sheet_001',range:'Tracker!A1:A1',expected_values:[['unpaid']],values:[['paid']],reason:'fixture',evidence:'new1'});assert.equal(result.status,'confirmed');
 const notices=(await readFile('/fixture/notices.jsonl','utf8')).trim().split('\n').map(JSON.parse);assert.equal(notices.length,1);assert.deepEqual(notices[0].after,[['paid']]);
 process.stdout.write('Fixture Gmail to Sheets and durable notice passed.\n');
} finally {server.kill();}
