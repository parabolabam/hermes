import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {accountName,readStore,writePrivate} from './store.ts';
const scopes=['openid','email','https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.modify','https://www.googleapis.com/auth/gmail.compose','https://www.googleapis.com/auth/spreadsheets'];
export function validState(expected:string,actual:string):boolean {const a=Buffer.from(expected),b=Buffer.from(actual);return a.length===b.length&&timingSafeEqual(a,b);}
export async function client(dir:string):Promise<{client_id:string;client_secret:string}>{
 let raw:string;try{raw=await readFile(join(dir,'client.json'),'utf8');}catch{throw new Error('Place a Google Desktop OAuth client JSON at .runtime/google/client.json');}
 let data:{installed?:{client_id?:unknown;client_secret?:unknown}};try{data=JSON.parse(raw) as typeof data;}catch{throw new Error('Place a Google Desktop OAuth client JSON at .runtime/google/client.json');}
 if(typeof data.installed?.client_id!=='string'||typeof data.installed.client_secret!=='string')throw new Error('Place a Google Desktop OAuth client JSON at .runtime/google/client.json');
 return {client_id:data.installed.client_id,client_secret:data.installed.client_secret};
}
async function tokenRequest(body:URLSearchParams):Promise<Record<string,unknown>>{
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('Google token request failed');return await res.json() as Record<string,unknown>;
}
export async function refresh(dir:string,refreshToken:string):Promise<{access_token:string;expires_in:number}>{
 const c=await client(dir);const result=await tokenRequest(new URLSearchParams({...c,refresh_token:refreshToken,grant_type:'refresh_token'}));
 if(typeof result.access_token!=='string'||typeof result.expires_in!=='number')throw new Error('Google token response invalid');return {access_token:result.access_token,expires_in:result.expires_in};
}
export async function authorize(dir:string,name:string,replace:boolean):Promise<void>{
 accountName(name);const current=await readStore(dir);if(current.accounts.some(a=>a.name===name)&&!replace)throw new Error('Account exists; use --replace explicitly');
 const c=await client(dir), verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('base64url');
 const params=new URLSearchParams({client_id:c.client_id,redirect_uri:'http://127.0.0.1:8765',response_type:'code',scope:scopes.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
 const code=await new Promise<string>((resolve,reject)=>{
  const server=createServer((req,res)=>{const url=new URL(req.url??'/', 'http://127.0.0.1:8765');if(url.pathname!=='/'||!validState(state,url.searchParams.get('state')??'')||!url.searchParams.get('code')){res.writeHead(400);res.end('Authorization failed.');return;}
   const value=url.searchParams.get('code');if(!value){res.writeHead(400);res.end('Authorization failed.');return;}res.end('Authorization received. You can close this page.');server.close();resolve(value);
  });server.once('error',reject);server.listen(8765,'0.0.0.0',()=>process.stdout.write(`Open this URL in your browser:\nhttps://accounts.google.com/o/oauth2/v2/auth?${params.toString()}\n`));
  const timer=setTimeout(()=>{server.close();reject(new Error('Authorization timed out'));},300000);server.on('close',()=>clearTimeout(timer));
 });
 const tokens=await tokenRequest(new URLSearchParams({...c,code,code_verifier:verifier,redirect_uri:'http://127.0.0.1:8765',grant_type:'authorization_code'}));
 if(typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string')throw new Error('Google did not issue a refresh grant; retry consent');
 const profile=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!profile.ok)throw new Error('Could not verify Google account');const info=await profile.json() as {email?:unknown;email_verified?:unknown};
 if(typeof info.email!=='string'||info.email_verified!==true)throw new Error('Google account email not verified');
 const previous=current.accounts.find(a=>a.name===name);if(previous&&previous.email!==info.email&&!replace)throw new Error('Account mismatch');
 const saved=await readStore(dir);const latest=saved.accounts.find(a=>a.name===name);if(JSON.stringify(latest)!==JSON.stringify(previous))throw new Error('account changed during authorization');saved.accounts=saved.accounts.filter(a=>a.name!==name);saved.accounts.push({name,email:info.email,cutoff:previous?.email===info.email?previous.cutoff:Date.now(),generation:randomUUID(),refresh_token:tokens.refresh_token});await writePrivate(dir,'config.json',saved);
 process.stdout.write(`Authorized account ${name}; monitoring cutoff is preserved.\n`);
}
