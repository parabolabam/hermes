import {createHandler} from './http.ts';
import {privateTelegram} from './telegram.ts';
import {GrantSession,type PinnedGrant} from './grant-session.ts';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {dispatch,type Account,type APITransport,type Sheet} from './api.ts';
import {Journal,type Change,type Event,type Remote} from './journal.ts';
import {readStore} from './store.ts';
import {refresh} from './oauth.ts';
import type {Matrix} from './policy.ts';
const dir='/data';
const uid=Number(process.env.HERMES_UID),gid=Number(process.env.HERMES_GID);
if(!Number.isInteger(uid)||uid<1||uid>65534||!Number.isInteger(gid)||gid<1||gid>65534)throw new Error('Invalid runtime UID/GID');
if(process.getuid?.()===0){process.setgid?.(gid);process.setuid?.(uid);}
const secret=(await readFile('/run/secrets/life-api-key','utf8')).trim();if(secret.length<32)throw new Error('Invalid bearer secret');
function authenticated(header:string|undefined):boolean {const candidate=Buffer.from(header??'');const expected=Buffer.from(`Bearer ${secret}`);return candidate.length===expected.length&&timingSafeEqual(candidate,expected);}
const sessions=new GrantSession(async name=>(await readStore(dir)).accounts.find(a=>a.name===name),token=>refresh(dir,token));
async function google(account:Account,url:string,method:'GET'|'POST'|'PUT',body?:unknown,active?:()=>void):Promise<unknown>{
 if(typeof account.refresh_token!=='string')throw new Error('account unavailable');
 const token=await sessions.token(account as PinnedGrant);
 active?.();const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Google request failed');return await response.json() as unknown;
}
function sheetAccount(sheet:Sheet,accounts:Account[]):Account {const a=accounts.find(x=>x.name===sheet.account);if(!a)throw new Error('sheet account unavailable');return a;}
let activeSheetAccount:Account|undefined;let activeSheetCheck:(()=>void)|undefined;
async function sheetsRead(sheet:Sheet,range:string,pinned?:Account):Promise<Matrix>{
 const store=await readStore(dir);const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`;
 const result=await google(pinned??sheetAccount(sheet,store.accounts),url,'GET') as {values?:Matrix};return result.values??[];
}
const remote:Remote={
 read:async(id,range)=>{const s=(await readStore(dir)).sheets.find(x=>x.id===id);if(!s)throw new Error('sheet unavailable');if(activeSheetAccount&&s.account!==activeSheetAccount.name)throw new Error('sheet account changed');return sheetsRead(s,range,activeSheetAccount);},
 write:async(id,range,values)=>{const store=await readStore(dir),s=store.sheets.find(x=>x.id===id);if(!s)throw new Error('sheet unavailable');if(activeSheetAccount&&s.account!==activeSheetAccount.name)throw new Error('sheet account changed');await google(activeSheetAccount??sheetAccount(s,store.accounts),`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,'PUT',{range,values},activeSheetCheck);},
 notify:async(event:Event)=>{
  const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_HOME_CHANNEL;if(!privateTelegram(token,process.env.TELEGRAM_ALLOWED_USERS,chat))throw new Error('notification unavailable');
  const text=`Sheet ${event.status==='confirmed'?'update confirmed':'write uncertain; review required'}: ${event.alias}\nRange: ${event.range}\nBefore: ${JSON.stringify(event.before)}\nAfter: ${JSON.stringify(event.after)}\nReason: ${event.reason}\nEvidence: ${event.evidence}\nEvent: ${event.id}`;
  const message=text.length>4000?`${text.slice(0,3600)}\n[summary truncated; event ${event.id}]`:text;
  const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,text:message}),redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('notification failed');const result=await response.json() as {ok?:boolean};if(result.ok!==true)throw new Error('notification failed');
 }
};
const journal=await Journal.open(dir,remote);
const transport:APITransport={
 gmail:async(account,method,path,body,active)=>google(account,`https://gmail.googleapis.com/gmail/v1/users/me${path}`,method,body,active),
 sheetMetadata:async(sheet,account)=>google(account,`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet.id)}?fields=properties.title%2Csheets.properties`,'GET'),
 sheetRead:sheetsRead,
 sheetWrite:async(change:Change,account:Account,active:()=>void)=>{activeSheetAccount=account;activeSheetCheck=active;try{const e=await journal.write(change,active);return {event_id:e.id,status:e.status};}finally{activeSheetAccount=undefined;activeSheetCheck=undefined;}}
};
let queue:Promise<void>=Promise.resolve();
function serial<T>(job:()=>Promise<T>):Promise<T>{const result=queue.then(job);queue=result.then(()=>{},()=>{});return result;}
async function maintain():Promise<void>{try{await journal.reconcile();}catch{}await journal.retryNotices();}
void serial(maintain);setInterval(()=>void serial(maintain),30000).unref();
createServer(createHandler({
 authorized:authenticated,
 health:async()=>{const c=await readStore(dir);const telegram=privateTelegram(process.env.TELEGRAM_BOT_TOKEN,process.env.TELEGRAM_ALLOWED_USERS,process.env.TELEGRAM_HOME_CHANNEL);return {accounts_configured:c.accounts.length,sheets_configured:c.sheets.length,telegram_configured:telegram,ready:c.accounts.length>0&&c.sheets.length>0&&telegram};},
 accounts:async()=>{const c=await readStore(dir);return {accounts:c.accounts.map(({name,email,cutoff})=>({name,email,read_since:new Date(cutoff).toISOString()})),sheets:c.sheets};},
 serial,
 dispatch:async(route,input,active)=>dispatch(await readStore(dir),transport,route,input,active)
})).listen(8787,'::');
