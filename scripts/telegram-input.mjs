import {privateTelegram} from '../google/telegram.ts';
let input='';for await (const chunk of process.stdin) input+=chunk;
const [token,users,chat]=input.trimEnd().split('\n');
if(!privateTelegram(token,users,chat)) process.exit(1);
