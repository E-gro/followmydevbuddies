import { DatabaseSync } from 'node:sqlite';
const secret='local-test-secret';
const enc=new TextEncoder();
const hex=data=>Array.from(new Uint8Array(data)).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function setup() {
 const sql=new DatabaseSync(':memory:');
 sql.exec("CREATE TABLE cards (id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL, payload TEXT NOT NULL); CREATE TABLE community_follows (owner_id INTEGER NOT NULL,card_id TEXT NOT NULL,platform TEXT NOT NULL,PRIMARY KEY(owner_id,card_id,platform)); CREATE TABLE fmdb_sessions (session_hash TEXT PRIMARY KEY,owner_id INTEGER NOT NULL,user_json TEXT NOT NULL,token_cipher TEXT NOT NULL,token_iv TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE moderation_reports (id TEXT PRIMARY KEY,reporter_id INTEGER NOT NULL,card_id TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL); CREATE TABLE hidden_cards (card_id TEXT PRIMARY KEY,moderator_id INTEGER NOT NULL,created_at TEXT NOT NULL)");
 const db={prepare(query){let args=[];const s={query,bind(...a){args=a;return s},async first(){return sql.prepare(query).get(...args)??null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return sql.prepare(query).run(...args)}};return s},async batch(stmts){sql.exec('BEGIN');try{const results=[];for(const s of stmts) results.push(s.query.startsWith('SELECT') ? await s.all() : await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
 const ids={alice:'a'.repeat(64),bob:'b'.repeat(64)};
 const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(`fmdb-session-v1:${secret}`)),'AES-GCM',false,['encrypt']);
 for(const [name,id] of Object.entries(ids)) {
  const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(`token-${name}`)); const hash=hex(await crypto.subtle.digest('SHA-256',enc.encode(id))); const owner=name==='alice'?1:2;
  sql.prepare('INSERT INTO fmdb_sessions VALUES (?,?,?,?,?,?)').run(hash,owner,JSON.stringify({githubId:owner,login:name}),hex(cipher),hex(iv),Date.now()+100000);
 }
 const request=(body,who='alice',origin='https://fmdb.pixelstd.com.br')=>new Request('https://fmdb.pixelstd.com.br/api/fmdb',{method:'POST',headers:{origin,cookie:`__Host-fmdb_session=${ids[who]||'c'.repeat(64)}`,'content-type':'application/json'},body:JSON.stringify(body)});
 const env={FMDB_DB:db,GITHUB_CLIENT_ID:'test-id',GITHUB_CLIENT_SECRET:secret,FMDB_ADMIN_ID:'1'};
 return {db,env,request,sql};
}
