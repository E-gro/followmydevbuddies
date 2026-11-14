import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupCommunity } from '../.test-build/fmdb-backup.js';
test('backup inclui dados comunitários, exclui sessões e expira em sete dias', async () => {
 const calls=[]; const db={prepare(sql){calls.push(sql);return sql},async batch(statements){return statements.map((_,i)=>({results:[{id:i}]}))}};let saved;
 const store={async put(key,value,options){saved={key,value,options}}};
 await backupCommunity(db,store,new Date('2026-11-14T05:00:00Z'));
 const data=JSON.parse(saved.value);assert.deepEqual(Object.keys(data.tables),['cards','community_follows','moderation_reports','hidden_cards']);assert.ok(!calls.some(c=>c.includes('fmdb_sessions')));assert.equal(saved.key,'daily:2026-11-14');assert.equal(saved.options.expirationTtl,604800);
});
