import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOAuth, finishOAuth, getSession, sessionEndpoint } from '../.test-build/fmdb-session.js';
import { setup } from './fmdb-support.mjs';

test('OAuth usa estado e token fica apenas em sessão protegida', async () => {
 const {env,sql}=await setup(); const original=globalThis.fetch;
 try {
  let result=await startOAuth(new Request('https://fmdb.pixelstd.com.br/api/fmdb/auth'),env);
  const oauth=new URL(result.headers.get('location')); const state=oauth.searchParams.get('state'); assert.ok(state); assert.equal(oauth.searchParams.get('scope'),'read:user'); assert.match(result.headers.get('set-cookie'),/HttpOnly/);
  const followStart=await startOAuth(new Request('https://fmdb.pixelstd.com.br/api/fmdb/auth?follow=1'),env); assert.match(new URL(followStart.headers.get('location')).searchParams.get('scope'),/user:follow/);
  let invalid=await finishOAuth(new Request('https://fmdb.pixelstd.com.br/api/fmdb/callback?code=x&state=bad',{headers:{cookie:`fmdb_oauth_state=${state}`}}),env); assert.equal(invalid.status,400);
  globalThis.fetch=async url=>String(url).includes('access_token') ? Response.json({access_token:'test-secret-token',expires_in:3600,scope:'read:user'}) : Response.json({id:123,login:'dev',name:'Dev'});
  result=await finishOAuth(new Request(`https://fmdb.pixelstd.com.br/api/fmdb/callback?code=x&state=${state}`,{headers:{cookie:`fmdb_oauth_state=${state}`}}),env);
  assert.equal(result.status,302); assert.doesNotMatch(result.headers.get('location'),/test-secret-token/); const cookies=result.headers.getSetCookie(); const sessionCookie=cookies.find(x=>x.startsWith('__Host-fmdb_session=')); assert.match(sessionCookie,/HttpOnly/); assert.match(sessionCookie,/Secure/); assert.doesNotMatch(sessionCookie,/test-secret-token/);
  const cookie=sessionCookie.split(';')[0]; const session=await getSession(new Request('https://fmdb.pixelstd.com.br/api/fmdb/session',{headers:{cookie}}),env); assert.equal(session.user.githubId,123); assert.equal(session.user.canFollow,false); assert.equal(session.token,'test-secret-token');
  const publicSession=await sessionEndpoint(new Request('https://fmdb.pixelstd.com.br/api/fmdb/session',{headers:{cookie}}),env); assert.doesNotMatch(await publicSession.text(),/test-secret-token/);
  const row=sql.prepare('SELECT token_cipher FROM fmdb_sessions WHERE owner_id=123').get(); assert.doesNotMatch(row.token_cipher,/test-secret-token/);
  assert.equal((await sessionEndpoint(new Request('https://fmdb.pixelstd.com.br/api/fmdb/session',{method:'POST',headers:{origin:'https://evil.example',cookie}}),env)).status,403);
  assert.equal((await sessionEndpoint(new Request('https://fmdb.pixelstd.com.br/api/fmdb/session',{method:'POST',headers:{origin:'https://fmdb.pixelstd.com.br',cookie}}),env)).status,204);
  assert.equal(await getSession(new Request('https://fmdb.pixelstd.com.br/api/fmdb/session',{headers:{cookie}}),env),null);
 } finally {globalThis.fetch=original;sql.close()}
});
