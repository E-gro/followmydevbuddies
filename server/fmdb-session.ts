import type { FmdbDatabase } from './fmdb-api';
import type { BackupStore } from './fmdb-backup';

export interface SessionEnv { FMDB_DB: FmdbDatabase; GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string; FMDB_ADMIN_ID?: string; FMDB_BACKUPS?: BackupStore }
export interface SessionUser { githubId: number; login: string; name: string; avatarUrl: string; bio: string; company: string; blog: string; twitterUsername: string; canFollow: boolean }
export interface Session { user: SessionUser; token: string; sessionHash: string }
const cookieName = '__Host-fmdb_session';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function hex(data: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(data)).map(x => x.toString(16).padStart(2, '0')).join(''); }
function fromHex(value: string) { return Uint8Array.from(value.match(/../g) || [], x => parseInt(x, 16)); }
async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function key(secret: string) { return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', encoder.encode(`fmdb-session-v1:${secret}`)), 'AES-GCM', false, ['encrypt','decrypt']); }
function cookie(request: Request, name: string) { return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length + 1); }
function expiredCookie() { return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
export async function getSession(request: Request, env: SessionEnv): Promise<Session | null> {
  const id = cookie(request,cookieName);
  if (!id || !/^[0-9a-f]{64}$/.test(id) || !env.GITHUB_CLIENT_SECRET) return null;
  const sessionHash = await digest(id);
  const row = await env.FMDB_DB.prepare('SELECT user_json, token_cipher, token_iv FROM fmdb_sessions WHERE session_hash = ? AND expires_at > ?').bind(sessionHash, Date.now()).first<{user_json:string;token_cipher:string;token_iv:string}>();
  if (!row) return null;
  try {
    const token = decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromHex(row.token_iv)},await key(env.GITHUB_CLIENT_SECRET),fromHex(row.token_cipher)));
    const user = JSON.parse(row.user_json) as SessionUser;
    if (!Number.isSafeInteger(user.githubId) || !user.login) return null;
    return {user,token,sessionHash};
  } catch { return null; }
}
export async function startOAuth(request: Request, env: SessionEnv): Promise<Response> {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return new Response('Login temporariamente indisponível.',{status:503});
  const state=hex(crypto.getRandomValues(new Uint8Array(32)));
  const url=new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id',env.GITHUB_CLIENT_ID); url.searchParams.set('redirect_uri',`${new URL(request.url).origin}/api/fmdb/callback`); url.searchParams.set('scope',new URL(request.url).searchParams.get('follow') === '1' ? 'read:user user:follow' : 'read:user'); url.searchParams.set('state',state);
  return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':`fmdb_oauth_state=${state}; Path=/api/fmdb; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,'Cache-Control':'no-store'}});
}
export async function finishOAuth(request: Request, env: SessionEnv): Promise<Response> {
  const url=new URL(request.url); const code=url.searchParams.get('code'); const state=url.searchParams.get('state'); const saved=cookie(request,'fmdb_oauth_state');
  const headers=new Headers({'Cache-Control':'no-store','Set-Cookie':'fmdb_oauth_state=; Path=/api/fmdb; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
  if (!code || !state || !saved || state!==saved || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return new Response('Não foi possível confirmar o login.',{status:400,headers});
  try {
    const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${url.origin}/api/fmdb/callback`})});
    const data=await response.json() as {access_token?:string; expires_in?:number; scope?:string};
    if (!response.ok || !data.access_token) throw new Error('oauth');
    const profile=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${data.access_token}`,Accept:'application/vnd.github+json','User-Agent':'FollowMyDevBuddies'}});
    const p=await profile.json() as {id?:number;login?:string;name?:string;avatar_url?:string;bio?:string;company?:string;blog?:string;twitter_username?:string};
    if (!profile.ok || !Number.isSafeInteger(p.id) || !p.login) throw new Error('profile');
    const user:SessionUser={githubId:p.id!,login:p.login,name:p.name || p.login,avatarUrl:p.avatar_url || '',bio:p.bio || '',company:p.company || '',blog:p.blog || '',twitterUsername:p.twitter_username || '',canFollow:(data.scope || '').split(/[ ,]+/).some(scope => scope === 'user:follow' || scope === 'user')};
    const id=hex(crypto.getRandomValues(new Uint8Array(32))); const iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env.GITHUB_CLIENT_SECRET),encoder.encode(data.access_token));
    const expiry=Date.now()+Math.min(8*60*60,Math.max(60,Number(data.expires_in)||8*60*60))*1000;
    await env.FMDB_DB.batch([env.FMDB_DB.prepare('DELETE FROM fmdb_sessions WHERE expires_at <= ?').bind(Date.now()), env.FMDB_DB.prepare('INSERT INTO fmdb_sessions (session_hash, owner_id, user_json, token_cipher, token_iv, expires_at) VALUES (?, ?, ?, ?, ?, ?)').bind(await digest(id),user.githubId,JSON.stringify(user),hex(cipher),hex(iv),expiry)]);
    headers.append('Set-Cookie',`${cookieName}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expiry-Date.now())/1000)}`); headers.set('Location',`${url.origin}/fmdb?login=ok`); headers.set('Referrer-Policy','no-referrer');
    return new Response(null,{status:302,headers});
  } catch { return new Response('Não foi possível concluir o login. Volte ao portal e tente novamente.',{status:502,headers}); }
}
export async function sessionEndpoint(request: Request, env: SessionEnv): Promise<Response> {
  const session=await getSession(request,env);
  if (request.method==='GET') return Response.json({user:session?.user || null},{headers:{'Cache-Control':'no-store'}});
  if (request.method==='POST' && request.headers.get('origin')===new URL(request.url).origin) {
    if (session) await env.FMDB_DB.prepare('DELETE FROM fmdb_sessions WHERE session_hash = ?').bind(session.sessionHash).run();
    return new Response(null,{status:204,headers:{'Set-Cookie':expiredCookie(),'Cache-Control':'no-store'}});
  }
  return new Response(null,{status:403});
}
