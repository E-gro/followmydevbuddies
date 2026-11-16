import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmdbApi } from '../.test-build/fmdb-api.js';
import { setup } from './fmdb-support.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0u0AAAAASUVORK5CYII=';
const profile={id:'new:1',name:'Avatar sintético',avatarUrl:png,socials:{github:'alice'},tags:[]};
const get=url=>new Request(new URL(url,'https://fmdb.pixelstd.com.br'));

test('imagem legada sai por URL pública versionada, cache e 304; editar mantém bytes',async()=>{
 const {db,env,request,sql}=await setup();
 try {
  // Fixture legada: sem escrever na listagem ou migrar dados.
  sql.prepare('INSERT INTO cards VALUES (?,?,?)').run('legacy',1,JSON.stringify({...profile,id:'legacy'}));
  const data=await (await fmdbApi(get('/api/fmdb'),db,env)).json();
  const card=data.buddies[0];
  assert.ok(card.avatarUrl.startsWith('/api/fmdb?avatar=legacy&v='));
  assert.ok(!JSON.stringify(data).includes('base64'));
  const image=await fmdbApi(get(card.avatarUrl),db,env);
  assert.equal(image.headers.get('content-type'),'image/png');
  assert.ok(image.headers.get('cache-control').includes('immutable'));
  assert.deepEqual(Buffer.from(await image.arrayBuffer()),Buffer.from(png.split(',')[1],'base64'));
  const cached=get(card.avatarUrl);cached.headers.set('if-none-match',image.headers.get('etag'));
  assert.equal((await fmdbApi(cached,db,env)).status,304);
  assert.equal((await fmdbApi(get(card.avatarUrl.replace(/v=.*/, 'v=wrong')),db,env)).status,404);
  assert.equal((await fmdbApi(request({action:'upsert',buddy:card}),db,env)).status,200);
  assert.equal(JSON.parse(sql.prepare('SELECT payload FROM cards WHERE id=?').get('legacy').payload).avatarUrl,png);
  assert.equal((await fmdbApi(request({action:'upsert',buddy:{...card,avatarUrl:card.avatarUrl+'x'}}),db,env)).status,400);
  sql.prepare('INSERT INTO hidden_cards VALUES (?,?,?)').run('legacy',1,'2026-11-15');
  assert.equal((await fmdbApi(get(card.avatarUrl),db,env)).status,404);
 } finally {sql.close()}
});

test('servidor rejeita upload acima de 48 KB e MIME falso; salva imagem válida separada do JSON público',async()=>{
 const {db,env,request,sql}=await setup();try {
  for(const avatarUrl of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,aGVsbG8=',`data:image/jpeg;base64,${Buffer.alloc(49153,255).toString('base64')}`]) {
   assert.equal((await fmdbApi(request({action:'upsert',buddy:{...profile,avatarUrl}}),db,env)).status,400);
  }
  const response=await fmdbApi(request({action:'upsert',buddy:profile}),db,env);
  assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes('base64'));
  const card=JSON.parse(text).buddies[0];
  await fmdbApi(request({action:'delete',buddyId:card.id}),db,env);
  assert.equal((await fmdbApi(get(card.avatarUrl),db,env)).status,404);
 } finally {sql.close()}
});
