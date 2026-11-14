import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmdbApi } from '../.test-build/fmdb-api.js';
import { setup } from './fmdb-support.mjs';
test('progresso é isolado por conta, persiste e atualiza ranking', async () => {
 const {db,env,request,sql}=await setup();
 const post=(body,who='alice')=>fmdbApi(request(body,who),db,env);
 try {
  const p={id:'new:1',name:'Alice',role:'Dev',socials:{github:'alice'},tags:[],avatarUrl:'',bio:'',joinedAt:'2026-01-01'};
  const a=await (await post({action:'upsert',buddy:p})).json(); const alice=a.buddies[0].id;
  const b=await (await post({action:'upsert',buddy:{...p,id:'new:2',name:'Bob'}},'bob')).json(); const bob=b.buddies.find(x=>x.name==='Bob').id;
  assert.equal((await post({action:'setFollows',changes:[{buddyId:bob,platform:'github',followed:true}]})).status,200);
  assert.equal((await (await post({action:'getProgress'})).json()).followed[`${bob}:github`],true);
  assert.deepEqual((await (await post({action:'getProgress'},'bob')).json()).followed,{});
  let cards=await (await fmdbApi(new Request('https://fmdb.pixelstd.com.br/api/fmdb'),db,env)).json(); assert.equal(cards.buddies.find(x=>x.id===alice).communityFollowsDone,1);
  await post({action:'setFollows',changes:[{buddyId:bob,platform:'instagram',followed:true}]}); cards=await (await fmdbApi(new Request('https://fmdb.pixelstd.com.br/api/fmdb'),db,env)).json(); assert.equal(cards.buddies.find(x=>x.id===alice).communityFollowsDone,1);
  await post({action:'delete',buddyId:bob},'bob'); assert.deepEqual((await (await post({action:'getProgress'})).json()).followed,{});
  cards=await (await fmdbApi(new Request('https://fmdb.pixelstd.com.br/api/fmdb'),db,env)).json(); assert.equal(cards.buddies[0].communityFollowsDone,0);
 } finally {sql.close()}
});
