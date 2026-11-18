import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,cpSync,chownSync,readdirSync,statSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {installSkills} from './install-skills.mjs';
const role=process.env.HERMES_ROLE;
if(!['life','coding','google'].includes(role))throw Error('Set HERMES_ROLE to life, coding or google');
const uid=Number(process.env.HERMES_UID),gid=Number(process.env.HERMES_GID);
if(!Number.isInteger(uid)||uid<1||uid>65534||!Number.isInteger(gid)||gid<1||gid>65534)throw Error('Set non-root HERMES_UID and HERMES_GID');
const directory=role==='google'?'/data':'/opt/data';
mkdirSync(directory,{recursive:true,mode:0o700});chownSync(directory,uid,gid);
if(role==='coding'&&process.env.LIFE_API_KEY)throw Error('Life connector secret must not be given to coding');
if(role!=='coding'){
 const key=process.env.LIFE_API_KEY;
 if(!key||!/^[a-f0-9]{64}$/.test(key))throw Error('Set the private LIFE_API_KEY');
 mkdirSync('/run/secrets',{recursive:true,mode:0o700});
 writeFileSync('/run/secrets/life-api-key',key+'\n',{mode:0o600});
 chownSync('/run/secrets',uid,gid);chownSync('/run/secrets/life-api-key',uid,gid);chmodSync('/run/secrets/life-api-key',0o600);
}
if(role!=='google'){
 const target='/opt/data/config.yaml';
 if(!existsSync(target)){
  const model=process.env.HERMES_MODEL;
  if(!model||!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(model))throw Error('Set an explicitly authorized HERMES_MODEL');
  const config=readFileSync('/opt/hermes-deployment/config/base.yaml','utf8');
  if(!config.includes('default: ""'))throw Error('Unexpected base model configuration');
  writeFileSync(target,config.replace('default: ""',`default: "${model}"`),{mode:0o600});chownSync(target,uid,gid);
 }
 const soul='/opt/data/SOUL.md';
 copyFileSync(`/opt/hermes-deployment/config/${role}/AGENTS.md`,soul);chownSync(soul,uid,gid);
 installSkills(`/opt/hermes-deployment/skills/${role}`,'/opt/data/skills',{own:entry=>chownSync(entry,uid,gid)});
 const own=entry=>{chownSync(entry,uid,gid);if(statSync(entry).isDirectory())for(const child of readdirSync(entry))own(join(entry,child));};
 if(role==='life'){
  mkdirSync('/opt/data/plugins',{recursive:true,mode:0o700});
  chownSync('/opt/data/plugins',uid,gid);
  const plugin='/opt/data/plugins/restricted-google';
  cpSync('/opt/hermes-deployment/plugins/restricted-google',plugin,{recursive:true});
  own(plugin);
  execFileSync('/opt/hermes/.venv/bin/python',[`${plugin}/configure.py`,'/opt/data','/opt/hermes-deployment/config/life'],{stdio:'inherit'});
 }
}
