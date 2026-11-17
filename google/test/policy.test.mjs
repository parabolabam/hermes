import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeShape, validateLabel, validateDraft, validateWrite, isNewMail } from '../policy.ts';

test('cutoff cannot be bypassed by message identifier', () => {
  assert.equal(isNewMail('100', 101), false);
  assert.equal(isNewMail('101', 101), true);
  assert.throws(() => isNewMail('101 OR after:0', 101));
});
test('only Hermes custom labels', () => {
  for (const x of ['INBOX','Hermes/','Hermes/x\nBcc: x']) assert.throws(() => validateLabel(x));
  assert.equal(validateLabel('Hermes/urgent'), 'Hermes/urgent');
});
test('draft validates headers and recipients', () => {
  assert.throws(() => validateDraft({to:['a@example.com\r\nBcc: b@example.com'],subject:'hi',text:'body'}));
  assert.throws(() => validateDraft({to:['a@example.com'],subject:'hi\r\nBcc: x',text:'body'}));
  assert.doesNotThrow(() => validateDraft({to:['a@example.com'],subject:'hi',text:'body'}));
});
test('bounded explicit range and stale/formula rejection', () => {
  assert.deepEqual(rangeShape('Tab!A1:B2'), [2,2]);
  for (const r of ['A1:B2','Tab!A:A','Tab!A1:ZZ1000']) assert.throws(() => rangeShape(r));
  assert.throws(() => validateWrite([['=1']], [['=1']], [['safe']],1,1));
  assert.throws(() => validateWrite([['old']], [['different']], [['new']],1,1));
  assert.throws(() => validateWrite([['old']], [['old']], [['=NOW()']],1,1));
  assert.doesNotThrow(() => validateWrite([['old']], [['old']], [['new']],1,1));
});
test('reject explicit null and malformed mailbox dot-atoms',()=>{
 assert.throws(()=>validateWrite([['x','y']],[['x','y']],[[null,'z']],1,2));
 for(const address of ['a..b@example.com','a@ex..ample.com','a@-bad.example','a@example-.com']) assert.throws(()=>validateDraft({to:[address],subject:'hi',text:'body'}));
});
