import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmdbApi } from '../.test-build/fmdb-api.js';
import { sanitizeBuddy } from '../.test-build/route.js';
import { setup } from './fmdb-support.mjs';
const profile={id:'new:1',name:'Teste',role:'Dev',bio:'',avatarUrl:'',tags:[],socials:{github:'user'},joinedAt:'2026-01-01'};
test('somente proprietário pode editar e excluir seu cartão', async () => {
 const {db,env,request,sql}=await setup(); try { let res=await fmdbApi(request({action:'upsert',buddy:profile}),db,env); const id=(await res.json()).buddies[0].id;
 assert.equal((await fmdbApi(request({action:'upsert',buddy:{...profile,id}},'bob'),db,env)).status,403);
 assert.equal((await fmdbApi(request({action:'delete',buddyId:id},'bob'),db,env)).status,403);
 assert.equal((await fmdbApi(request({action:'delete',buddyId:id}),db,env)).status,200);
 } finally {sql.close()}
});
test('valida origem, sessão e tamanho de entrada', async () => {
 const {db,env,request,sql}=await setup(); try {assert.equal((await fmdbApi(request({},'alice','https://example.com'),db,env)).status,403);assert.equal((await fmdbApi(request({},'invalid'),db,env)).status,401);assert.equal((await fmdbApi(request({action:'upsert',buddy:{...profile,bio:'x'.repeat(121000)}}),db,env)).status,413);} finally {sql.close()}
});
test('seguir no GitHub exige permissão específica', async () => {
 const {db,env,request,sql}=await setup(); try { const response=await fmdbApi(request({action:'followGithub',buddyId:'card-1'}),db,env); assert.equal(response.status,403); } finally {sql.close()}
});
test('exclusão de conta remove apenas dados do titular e invalida suas sessões', async () => {
 const {db,env,request,sql}=await setup(); const original=globalThis.fetch; globalThis.fetch=async()=>new Response(null,{status:204}); try {await fmdbApi(request({action:'upsert',buddy:profile}),db,env);await fmdbApi(request({action:'upsert',buddy:{...profile,id:'new:2',name:'Outro'}},'bob'),db,env);const res=await fmdbApi(request({action:'deleteAccount'}),db,env);const data=await res.json();assert.equal(data.buddies.length,1);assert.equal(data.authorizationRevoked,true);assert.equal((await fmdbApi(request({action:'getProgress'}),db,env)).status,401);assert.equal((await fmdbApi(request({action:'getProgress'},'bob'),db,env)).status,200);} finally {globalThis.fetch=original;sql.close()}
});
test('avaliações e redes são validadas e preservam dados anteriores', () => {
 const clean=sanitizeBuddy({name:'Teste',socials:{bluesky:'https://bsky.app/profile/test.bsky.social'},tools:{ides:['VS Code'],agents:['Codex'],reviews:{'agents:codex':{status:'good',comment:'x'.repeat(500)},'agents:nao-selecionado':{status:'good',comment:'não'}}}},{id:1,login:'user'});assert.equal(clean.socials.bluesky,'test.bsky.social');assert.deepEqual(clean.tools.ides,['VS Code']);assert.equal(clean.tools.reviews['agents:codex'].comment.length,400);assert.equal(clean.tools.reviews['agents:nao-selecionado'],undefined);
});
