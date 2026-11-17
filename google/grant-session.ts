import type {Account} from './api.ts';
export interface PinnedGrant extends Account {refresh_token:string;generation?:string}
export interface AccessToken {access_token:string;expires_in:number}
function same(a:PinnedGrant|undefined,b:PinnedGrant):boolean {return !!a&&a.name===b.name&&a.email===b.email&&a.cutoff===b.cutoff&&a.generation===b.generation&&a.refresh_token===b.refresh_token;}
export class GrantSession {
 private current:(name:string)=>Promise<PinnedGrant|undefined>;
 private exchange:(refreshToken:string)=>Promise<AccessToken>;
 private cache=new Map<string,{grant:PinnedGrant;token:string;expires:number}>();
 constructor(current:(name:string)=>Promise<PinnedGrant|undefined>,exchange:(refreshToken:string)=>Promise<AccessToken>){this.current=current;this.exchange=exchange;}
 async token(grant:PinnedGrant):Promise<string>{
  if(!same(await this.current(grant.name),grant))throw new Error('account changed');
  const cached=this.cache.get(grant.name);if(cached&&same(cached.grant,grant)&&cached.expires>Date.now())return cached.token;
  const result=await this.exchange(grant.refresh_token);
  if(!same(await this.current(grant.name),grant))throw new Error('account changed');
  if(typeof result.access_token!=='string'||!result.access_token||!Number.isFinite(result.expires_in)||result.expires_in<=0)throw new Error('invalid token');
  const ttl=Math.max(0,result.expires_in*1000-60000);this.cache.set(grant.name,{grant:{...grant},token:result.access_token,expires:Date.now()+ttl});return result.access_token;
 }
}
