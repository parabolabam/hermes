import {isNewMail, rangeShape, validateDraft, validateLabel, type Matrix, type Draft} from './policy.ts';
import type {Change} from './journal.ts';
export interface Account {name:string; email:string; cutoff:number; refresh_token?:string; generation?:string}
export interface Sheet {id:string; alias:string; account:string}
export interface Config {accounts:Account[]; sheets:Sheet[]}
export interface APITransport {
 gmail(account:Account, method:'GET'|'POST', path:string, body?:unknown, active?:()=>void):Promise<unknown>;
 sheetMetadata(sheet:Sheet, account:Account):Promise<unknown>;
 sheetRead(sheet:Sheet, range:string, account:Account):Promise<Matrix>;
 sheetWrite(change:Change, account:Account, active:()=>void):Promise<unknown>;
}
function object(x:unknown):Record<string,unknown> {if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error('invalid request'); return x as Record<string,unknown>;}
function str(x:unknown):string {if (typeof x !== 'string' || !x) throw new Error('invalid request'); return x;}
function keys(o:Record<string,unknown>, allowed:string[]):void {if (Object.keys(o).some(k=>!allowed.includes(k))) throw new Error('invalid request');}
function id(x:unknown):string {const s=str(x);if (!/^[A-Za-z0-9_-]{1,200}$/.test(s)) throw new Error('invalid identifier');return s;}
function accountFor(config:Config, value:unknown):Account {const a=config.accounts.find(a=>a.name===value);if (!a) throw new Error('unknown account');return a;}
function sheetFor(config:Config, value:unknown):Sheet {const s=config.sheets.find(s=>s.id===value);if (!s) throw new Error('sheet not allowed');return s;}
function headers(message:Record<string,unknown>):Record<string,string> {
 const payload=object(message.payload); const raw=Array.isArray(payload.headers)?payload.headers:[]; const out:Record<string,string>={};
 for(const item of raw){const h=object(item);if(typeof h.name==='string'&&typeof h.value==='string') out[h.name.toLowerCase()]=h.value;}
 return out;
}
function textPart(part:unknown, mime='text/plain'):string {
 const p=object(part); if(p.mimeType===mime && p.body && typeof p.body==='object') {const body=object(p.body);if(typeof body.data==='string')return Buffer.from(body.data,'base64url').toString('utf8');}
 if(Array.isArray(p.parts)) for(const child of p.parts){const text=textPart(child,mime);if(text)return text;}
 return '';
}
async function metadataOnly(t:APITransport,a:Account,messageId:string,active:()=>void=()=>{}):Promise<Record<string,unknown>> {
 active();const metadata=object(await t.gmail(a,'GET',`/messages/${id(messageId)}?format=metadata&fields=internalDate%2ClabelIds`,undefined,active));if(!isNewMail(str(metadata.internalDate),a.cutoff))throw new Error('message outside monitoring window');return metadata;
}
async function accessible(t:APITransport,a:Account,messageId:string):Promise<Record<string,unknown>> {
 const path=`/messages/${id(messageId)}`;await metadataOnly(t,a,messageId);
 const message=object(await t.gmail(a,'GET',`${path}?format=full`));if(!isNewMail(str(message.internalDate),a.cutoff))throw new Error('message outside monitoring window');return message;
}
export async function dispatch(config:Config,t:APITransport,path:string,input:unknown,active:()=>void=()=>{}):Promise<unknown> {
 const b=object(input);
 if(path==='/gmail/list'){
  keys(b,['account','max_results','page_token']);const a=accountFor(config,b.account);
  if(!Number.isInteger(b.max_results)||Number(b.max_results)<1||Number(b.max_results)>50)throw new Error('invalid limit');
  let query=`/messages?maxResults=${Number(b.max_results)}&q=${encodeURIComponent(`after:${Math.max(0,Math.floor(a.cutoff/1000)-1)}`)}`;
  if(b.page_token!==undefined){const token=str(b.page_token);if(token.length>2048||/[\x00-\x1f\x7f]/.test(token))throw new Error('invalid page token');query+=`&pageToken=${encodeURIComponent(token)}`;}
  const result=object(await t.gmail(a,'GET',query));const ids:string[]=[];
  if(Array.isArray(result.messages))for(const item of result.messages){const m=object(item);const messageId=id(m.id);try {const metadata=await metadataOnly(t,a,messageId,active);if(!Array.isArray(metadata.labelIds))throw new Error('missing message labels');if(!metadata.labelIds.some(label=>['SENT','DRAFT','SPAM','TRASH'].includes(String(label))))ids.push(messageId);}catch(error){if(error instanceof Error&&error.message==='message outside monitoring window')continue;throw error;}}
  return {message_ids:ids,...(typeof result.nextPageToken==='string'?{next_page_token:result.nextPageToken}:{})};
 }
 if(path==='/gmail/read'){
  keys(b,['account','message_id']);const a=accountFor(config,b.account);const m=await accessible(t,a,id(b.message_id));const h=headers(m);
  return {subject:h.subject??'',from:h.from??'',to:h.to??'',date:h.date??'',text:textPart(m.payload)||textPart(m.payload,'text/html').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>'),label_ids:Array.isArray(m.labelIds)?m.labelIds:[]};
 }
 if(path==='/gmail/label'){
  keys(b,['account','message_id','label']);const a=accountFor(config,b.account);const messageId=id(b.message_id);const label=validateLabel(str(b.label));await metadataOnly(t,a,messageId);
  const existing=object(await t.gmail(a,'GET','/labels'));let labelId:string|undefined;
  if(Array.isArray(existing.labels))for(const item of existing.labels){const entry=object(item);if(entry.name===label && entry.type==='user')labelId=id(entry.id);}
  if(!labelId){active();const created=object(await t.gmail(a,'POST','/labels',{name:label,labelListVisibility:'labelShow',messageListVisibility:'show'},active));labelId=id(created.id);}
  active();await t.gmail(a,'POST',`/messages/${messageId}/modify`,{addLabelIds:[labelId]},active);return {label};
 }
 if(path==='/gmail/draft'){
  keys(b,['account','to','cc','subject','text','reply_to_message_id']);const a=accountFor(config,b.account);
  const draft=b as unknown as Draft;validateDraft(draft);
  let threadId:string|undefined;let replyHeaders='';
  if(b.reply_to_message_id!==undefined){const m=await accessible(t,a,id(b.reply_to_message_id));threadId=id(m.threadId);const h=headers(m);const messageId=str(h['message-id']);if(/[\r\n\x00-\x1f\x7f]/.test(messageId))throw new Error('invalid reply');replyHeaders=`In-Reply-To: ${messageId}\r\nReferences: ${messageId}\r\n`;}
  const chunks:string[]=[];let chunk='';for(const char of draft.subject){if(Buffer.byteLength(chunk+char,'utf8')>42){chunks.push(chunk);chunk='';}chunk+=char;}if(chunk)chunks.push(chunk);const subject=chunks.map(c=>`=?UTF-8?B?${Buffer.from(c,'utf8').toString('base64')}?=`).join('\r\n ');
  const mime=`To: ${draft.to.join(', ')}\r\n${draft.cc?.length?`Cc: ${draft.cc.join(', ')}\r\n`:''}Subject: ${subject}\r\n${replyHeaders}MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(draft.text).toString('base64').replace(/.{1,76}/g,'$&\r\n')}`;
  active();const result=object(await t.gmail(a,'POST','/drafts',{message:{raw:Buffer.from(mime).toString('base64url'),...(threadId?{threadId}:{})}},active));
  return {draft_id:id(result.id),review_url:`https://mail.google.com/mail/?authuser=${encodeURIComponent(a.email)}#drafts`};
 }
 if(path==='/sheets/metadata'){
  keys(b,['spreadsheet_id']);const sheet=sheetFor(config,b.spreadsheet_id);return t.sheetMetadata(sheet,accountFor(config,sheet.account));
 }
 if(path==='/sheets/read'){
  keys(b,['spreadsheet_id','range']);const sheet=sheetFor(config,b.spreadsheet_id);const range=str(b.range);rangeShape(range);return {values:await t.sheetRead(sheet,range,accountFor(config,sheet.account))};
 }
 if(path==='/sheets/write'){
  keys(b,['spreadsheet_id','range','expected_values','values','reason','evidence']);const sheet=sheetFor(config,b.spreadsheet_id);const range=str(b.range);rangeShape(range);
  if(!Array.isArray(b.expected_values)||!Array.isArray(b.values))throw new Error('invalid values');const reason=str(b.reason),evidence=str(b.evidence);if(!reason.trim()||!evidence.trim())throw new Error('invalid rationale');
  return t.sheetWrite({spreadsheet_id:sheet.id,alias:sheet.alias,range,expected_values:b.expected_values as Matrix,values:b.values as Matrix,reason,evidence},accountFor(config,sheet.account),active);
 }
 throw new Error('unknown route');
}
