import {readFileSync} from 'node:fs';
const identity=role=>{const text=readFileSync(`.runtime/${role}/telegram.env`,'utf8');const match=text.match(/^TELEGRAM_BOT_TOKEN=([1-9]\d*):/m);if(!match)throw Error('Invalid bot identity');return match[1];};
if(identity('life')===identity('coding'))throw Error('Roles require distinct bot identities');
