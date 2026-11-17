import {open,readFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Account,Sheet} from './api.ts';
export interface Grant extends Account {refresh_token:string;generation?:string}
export interface Store {accounts:Grant[];sheets:Sheet[]}
export async function readStore(dir:string):Promise<Store>{
 try {const value=JSON.parse(await readFile(join(dir,'config.json'),'utf8')) as Store;if(!Array.isArray(value.accounts)||!Array.isArray(value.sheets))throw new Error('invalid configuration');return value;}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {accounts:[],sheets:[]};throw new Error('invalid configuration');}
}
export async function writePrivate(dir:string,name:string,value:unknown):Promise<void>{
 const tmp=join(dir,`.tmp-${randomUUID()}`);const file=await open(tmp,'wx',0o600);
 try{await file.writeFile(JSON.stringify(value));await file.sync();}finally{await file.close();}
 await rename(tmp,join(dir,name));const folder=await open(dir,'r');try{await folder.sync();}finally{await folder.close();}
}
export function accountName(value:string):string {if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/.test(value))throw new Error('invalid account name');return value;}
