// Test-only entrypoint. No Google or Telegram transport and no production configuration.
import {createServer} from 'node:http';
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {dispatch} from '../api.ts';
import {Journal} from '../journal.ts';
const secret=(await readFile('/run/secrets/life-api-key','utf8')).trim();
const config={accounts:[{name:'fixture',email:'fixture@example.test',cutoff:1700000000000}],sheets:[{id:'fixture_sheet_001',alias:'fixture-tracker',account:'fixture'}]};
const remote={
 read:async()=>JSON.parse(await readFile('/fixture/sheet.json','utf8')),
 write:async(_id,_range,values)=>writeFile('/fixture/sheet.json',JSON.stringify(values)),
 notify:async event=>appendFile('/fixture/notices.jsonl',JSON.stringify({id:event.id,before:event.before,after:event.after,range:event.range})+'\n'),
};
const journal=await Journal.open('/fixture',remote);await journal.reconcile();await journal.retryNotices();
const message={id:'new1',internalDate:'1700000000001',threadId:'thread1',labelIds:JSON.parse(await readFile('/fixture/labels.json','utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;})),payload:{mimeType:'text/plain',headers:[{name:'Message-ID',value:'<fixture-message@example.test>'},{name:'Subject',value:'Fixture request'},{name:'From',value:'fixture@example.test'},{name:'To',value:'fixture@example.test'}],body:{data:Buffer.from('Fixture: tracker value should become paid.').toString('base64url')}}};
const fake={gmail:async(_account,method,path,body)=>{
 if(path.startsWith('/messages?'))return {messages:[{id:'new1'}]};
 if(path.startsWith('/messages/new1?'))return message;
 if(path==='/labels'&&method==='GET')return {labels:message.labelIds.map(id=>({id,name:'Hermes/action',type:'user'}))};
 if(path==='/labels'&&method==='POST')return {id:'Label_fixture'};
 if(path==='/messages/new1/modify'){message.labelIds=[...new Set([...message.labelIds,...body.addLabelIds])];await writeFile('/fixture/labels.json',JSON.stringify(message.labelIds));await appendFile('/fixture/actions.jsonl',JSON.stringify({method,path,body})+'\n');return {};}
 if(path==='/drafts'){await appendFile('/fixture/actions.jsonl',JSON.stringify({method,path,body})+'\n');return {id:'draft_fixture'};}
 throw Error('fixture route');
},sheetMetadata:async()=>({properties:{title:'Fixture Tracker'},sheets:[{properties:{title:'Tracker',gridProperties:{rowCount:100,columnCount:5}}}]}),sheetRead:async(_sheet,range)=>remote.read('',range),sheetWrite:async change=>{const event=await journal.write(change);await journal.retryNotices();return {event_id:event.id,status:event.status};}};
createServer(async(req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 if(req.method==='GET'&&req.url==='/health')return send(200,{fixture:true,ready:true});
 const actual=Buffer.from(req.headers.authorization??''),expected=Buffer.from(`Bearer ${secret}`);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return send(401,{code:'unauthorized'});
 if(req.method==='GET'&&req.url==='/accounts')return send(200,{accounts:config.accounts.map(a=>({name:a.name,email:a.email,read_since:new Date(a.cutoff).toISOString()})),sheets:config.sheets});
 try{if(req.method!=='POST')return send(404,{code:'not_found'});const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString());send(200,await dispatch(config,fake,req.url,body));}catch{send(400,{code:'request_failed',message:'Fixture request rejected'});}
}).listen(8787,'0.0.0.0');
