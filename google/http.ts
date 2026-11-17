import type {IncomingMessage,ServerResponse} from 'node:http';
export interface HandlerDependencies {
 authorized(header:string|undefined):boolean;
 health():Promise<unknown>;
 accounts():Promise<unknown>;
 serial<T>(job:()=>Promise<T>):Promise<T>;
 dispatch(path:string,body:unknown,active:()=>void):Promise<unknown>;
}
const routes=new Set(['/gmail/list','/gmail/read','/gmail/label','/gmail/draft','/sheets/metadata','/sheets/read','/sheets/write']);
export function createHandler(deps:HandlerDependencies):(req:IncomingMessage,res:ServerResponse)=>Promise<void> {
 return async(req,res)=>{
  let disconnected=false;
  res.on('close',()=>{if(!res.writableFinished)disconnected=true;});
  req.on('aborted',()=>{disconnected=true;});
  const active=()=>{if(disconnected||res.destroyed)throw new Error('request disconnected');};
  function send(status:number,value:unknown):void {if(disconnected||res.destroyed)return;res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));}
  try {
   if(req.method==='GET'&&req.url==='/health'){send(200,await deps.health());return;}
   if(!deps.authorized(req.headers.authorization)){send(401,{code:'unauthorized',message:'Unauthorized'});return;}
   if(req.method==='GET'&&req.url==='/accounts'){send(200,await deps.accounts());return;}
   if(req.method!=='POST'||!req.url||!routes.has(req.url)){send(404,{code:'not_found',message:'Route not found'});return;}
   if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']??'')){send(415,{code:'content_type',message:'JSON required'});return;}
   const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk as Uint8Array);size+=b.length;if(size>65536){send(413,{code:'too_large',message:'Request too large'});return;}chunks.push(b);}
   const input:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));const route=req.url;
   const result=await deps.serial(async()=>{active();return deps.dispatch(route,input,active);});send(200,result);
  }catch{if(!res.headersSent)send(400,{code:'request_failed',message:'Request rejected or upstream unavailable'});}
 };
}
