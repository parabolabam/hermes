import {safeSetupError} from './errors.ts';
import {authorize} from './oauth.ts';
import {accountName,readStore,writePrivate} from './store.ts';
const uid=Number(process.env.HERMES_UID),gid=Number(process.env.HERMES_GID);
if(!Number.isInteger(uid)||uid<1||uid>65534||!Number.isInteger(gid)||gid<1||gid>65534)throw new Error('Invalid runtime UID/GID');
if(process.getuid?.()===0){process.setgid?.(gid);process.setuid?.(uid);}
const dir='/data';
try {
 const [command,...args]=process.argv.slice(2);
 if(command==='authorize'&&args.length>=1&&args.length<=2&&(!args[1]||args[1]==='--replace')) await authorize(dir,accountName(args[0]!),args[1]==='--replace');
 else if(command==='sheet-add'&&args.length===3){
  const [alias,id,account]=args as [string,string,string];accountName(alias);accountName(account);if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw new Error('Invalid spreadsheet ID');
  const store=await readStore(dir);if(!store.accounts.some(a=>a.name===account))throw new Error('Authorize the sheet account first');if(store.sheets.some(s=>s.id===id||s.alias===alias))throw new Error('Sheet ID or alias already configured');
  store.sheets.push({alias,id,account});await writePrivate(dir,'config.json',store);process.stdout.write('Sheet allowlisted.\n');
 } else if(command==='history'&&args.length===2){
  const [name,daysString]=args as [string,string];accountName(name);const days=Number(daysString);if(!Number.isInteger(days)||days<1||days>30)throw new Error('History must be 1 to 30 days');
  const store=await readStore(dir),a=store.accounts.find(a=>a.name===name);if(!a)throw new Error('Unknown account');a.cutoff=Math.min(a.cutoff,Date.now()-days*86400000);await writePrivate(dir,'config.json',store);process.stdout.write('Historical window enabled.\n');
 } else throw new Error('Usage: authorize NAME [--replace] | sheet-add ALIAS ID ACCOUNT | history NAME DAYS');
}catch(error){process.stderr.write(`${safeSetupError(error)}\n`);process.exitCode=1;}
