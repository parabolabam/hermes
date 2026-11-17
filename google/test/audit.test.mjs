import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Journal} from '../journal.ts';

test('intent precedes write; confirmed event survives failed notice and restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hermes-audit-'));
  try {
    let current = [['old']]; let deliveries = 0;
    const remote = {read: async () => current, write: async (_id, _range, values) => {
      const state = JSON.parse(await readFile(join(dir,'journal.json'),'utf8'));
      assert.equal(state.events[0].status,'intent'); current = values;
    }, notify: async () => { deliveries++; if (deliveries === 1) throw Error('offline'); }};
    let journal = await Journal.open(dir, remote);
    await journal.write({spreadsheet_id:'sheet', range:'Tab!A1:A1', alias:'tracker', expected_values:[['old']], values:[['new']], reason:'due', evidence:'receipt'});
    await journal.retryNotices();
    journal = await Journal.open(dir, remote);
    await journal.retryNotices();
    const state = JSON.parse(await readFile(join(dir,'journal.json'),'utf8'));
    assert.equal(state.events[0].status,'confirmed');
    assert.equal(state.events[0].notice,'delivered');
    assert.deepEqual(state.events[0].before,[['old']]);
    assert.deepEqual(state.events[0].after,[['new']]);
    assert.equal(deliveries,2);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('uncertain writes reconcile without repeating remote write', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hermes-audit-'));
  try {
    let writes=0; let current=[['old']];
    const remote={read:async()=>current,write:async (_id,_range,values)=>{writes++;current=values;throw Error('connection lost');},notify:async()=>{}};
    let journal=await Journal.open(dir,remote);
    await assert.rejects(journal.write({spreadsheet_id:'s',range:'T!A1:A1',alias:'a',expected_values:[['old']],values:[['new']],reason:'r',evidence:'e'}));
    journal=await Journal.open(dir,remote); await journal.reconcile();
    const state=JSON.parse(await readFile(join(dir,'journal.json'),'utf8'));
    assert.equal(state.events[0].status,'confirmed'); assert.equal(writes,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('null write never creates intent or calls upstream write',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hermes-null-'));try {let writes=0;const remote={read:async()=>[['a','b']],write:async()=>{writes++;},notify:async()=>{}};const j=await Journal.open(dir,remote);await assert.rejects(j.write({spreadsheet_id:'s',range:'T!A1:B1',alias:'a',expected_values:[['a','b']],values:[[null,'c']],reason:'r',evidence:'e'}));assert.equal(writes,0);await assert.rejects(readFile(join(dir,'journal.json')));}finally{await rm(dir,{recursive:true,force:true});}
});
test('uncertain changed or restored writes produce durable review notices',async()=>{
 for(const later of [[['other']],[['old']]]){const dir=await mkdtemp(join(tmpdir(),'hermes-uncertain-'));try{let current=[['old']],notices=[],attempts=0;const remote={read:async()=>current,write:async()=>{current=[['new']];throw Error('lost');},notify:async e=>{attempts++;if(attempts===1)throw Error('offline');notices.push(structuredClone(e));}};let j=await Journal.open(dir,remote);await assert.rejects(j.write({spreadsheet_id:'s',range:'T!A1:A1',alias:'a',expected_values:[['old']],values:[['new']],reason:'r',evidence:'e'}));current=later;j=await Journal.open(dir,remote);await j.reconcile();await j.retryNotices();j=await Journal.open(dir,remote);await j.retryNotices();assert.equal(attempts,2);assert.equal(notices.length,1);assert.equal(notices[0].status,'uncertain');}finally{await rm(dir,{recursive:true,force:true});}}
});
test('inaccessible event does not starve another reconciliation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hermes-reconcile-'));try{let current={one:[['old']],two:[['old']]},blocked=false,notices=[];const remote={read:async id=>{if(blocked&&id==='one')throw Error('offline');return current[id];},write:async(id,_r,v)=>{current[id]=v;throw Error('lost');},notify:async e=>notices.push(e)};let j=await Journal.open(dir,remote);for(const id of ['one','two'])await assert.rejects(j.write({spreadsheet_id:id,range:'T!A1:A1',alias:id,expected_values:[['old']],values:[['new']],reason:'r',evidence:'e'}));blocked=true;await j.reconcile();await j.retryNotices();assert.ok(notices.some(e=>e.spreadsheet_id==='two'&&e.status==='confirmed'));}finally{await rm(dir,{recursive:true,force:true});}
});
