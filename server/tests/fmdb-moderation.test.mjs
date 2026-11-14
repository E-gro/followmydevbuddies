import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmdbApi } from '../.test-build/fmdb-api.js';
import { setup } from './fmdb-support.mjs';
test('denúncia é privada; moderador pode ocultar e restaurar', async () => {
 const {db,env,request,sql}=await setup(); const post=(body,who='alice')=>fmdbApi(request(body,who),db,env);
 try {
  let snapshot; env.FMDB_BACKUPS={async put(_key,value){snapshot=JSON.parse(value)}};
  assert.equal((await post({action:'backupNow'},'bob')).status,403);
  assert.equal((await post({action:'backupNow'})).status,200); assert.ok(snapshot.tables.cards); assert.equal(snapshot.tables.fmdb_sessions,undefined);
  const p={id:'new:1',name:'Bob',role:'Dev',socials:{github:'bob'},tags:[],avatarUrl:'',bio:'',joinedAt:'2026-01-01'};
  const created=await (await post({action:'upsert',buddy:p},'bob')).json(); const id=created.buddies[0].id;
  assert.equal((await post({action:'report',buddyId:id,reason:'Conteúdo inapropriado'},'bob')).status,200);
  assert.equal((await post({action:'listReports'},'bob')).status,403);
  const report=(await (await post({action:'listReports'})).json()).reports[0]; assert.equal(report.card_id,id);
  assert.equal((await post({action:'resolveReport',reportId:report.id,decision:'hide'})).status,200);
  assert.equal((await (await fmdbApi(new Request('https://fmdb.pixelstd.com.br/api/fmdb'),db,env)).json()).buddies.length,0);
  assert.equal((await post({action:'restoreCard',buddyId:id},'bob')).status,403);
  assert.equal((await post({action:'restoreCard',buddyId:id})).status,200);
  assert.equal((await (await fmdbApi(new Request('https://fmdb.pixelstd.com.br/api/fmdb'),db,env)).json()).buddies.length,1);
 } finally {sql.close()}
});
