import { sanitizeBuddy, sanitizeHandle, type DevBuddy } from "./app/api/fmdb/route";
import { getSession, type SessionEnv } from './fmdb-session';
import { backupCommunity } from './fmdb-backup';
import { avatarVersion, decodeAvatar, publicAvatar } from './fmdb-avatar';

type Statement = { bind(...args: unknown[]): Statement; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null>; run(): Promise<unknown> };
export type FmdbDatabase = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> };
const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
async function all(db: FmdbDatabase) {
  const result = await db.prepare("SELECT payload FROM cards WHERE NOT EXISTS (SELECT 1 FROM hidden_cards WHERE card_id = cards.id) ORDER BY rowid DESC").all<{ payload: string }>();
  return Promise.all(result.results.map(async row => {
    const card = JSON.parse(row.payload) as DevBuddy;
    return { ...card, avatarUrl: await publicAvatar(card.id, card.avatarUrl || '') };
  }));
}
export async function fmdbApi(request: Request, db: FmdbDatabase, env: SessionEnv) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.searchParams.has('avatar')) {
    const id = url.searchParams.get('avatar') || '';
    const row = await db.prepare('SELECT payload FROM cards WHERE id = ? AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE card_id = cards.id)').bind(id).first<{payload:string}>();
    const value = row ? (JSON.parse(row.payload) as DevBuddy).avatarUrl : '';
    const image = decodeAvatar(value);
    if (!image || url.searchParams.get('v') !== await avatarVersion(value)) return new Response(null, {status:404,headers:{'Cache-Control':'no-store'}});
    const etag = `"${url.searchParams.get('v')}"`;
    const imageHeaders = {'Content-Type':image.type,'Cache-Control':'public, max-age=31536000, immutable','ETag':etag,'X-Content-Type-Options':'nosniff'};
    return request.headers.get('if-none-match') === etag
      ? new Response(null,{status:304,headers:imageHeaders})
      : new Response(new Uint8Array(image.bytes).buffer,{headers:imageHeaders});
  }
  if (request.method === "GET") return json({ ok: true, buddies: await all(db) });
  if (request.method !== "POST") return json({ ok: false }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ ok: false, error: "Origem inválida." }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ ok: false, error: 'Formato inválido.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 120000) return json({ ok: false, error: 'Dados muito grandes.' }, 413);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: "Entre novamente com o GitHub." }, 401);
  const user = { id: session.user.githubId, login: session.user.login };
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 120000) { await reader.cancel(); return json({ ok: false, error: 'Dados muito grandes.' }, 413); }
      chunks.push(value);
    }
    const decoder = new TextDecoder();
    const body = JSON.parse(chunks.map(chunk => decoder.decode(chunk, { stream: true })).join('') + decoder.decode()) as { action?: string; buddy?: Partial<DevBuddy>; buddyId?: string; communityFollowsDone?: number; changes?: { buddyId: string; platform: string; followed: boolean }[]; reason?: string; reportId?: string; decision?: string };
    if (body.action === 'report') {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
      if (!body.buddyId || reason.length < 10) return json({ok:false,error:'Explique o problema em pelo menos 10 caracteres.'},400);
      const target = await db.prepare('SELECT owner_id, payload FROM cards WHERE id = ?').bind(body.buddyId).first<{owner_id:number;payload:string}>();
      if (!target) return json({ok:false,error:'Cartão não encontrado.'},404);
      const existing = await db.prepare("SELECT id FROM moderation_reports WHERE reporter_id = ? AND card_id = ? AND status = 'pending'").bind(user.id,body.buddyId).first<{id:string}>();
      if (existing) return json({ok:false,error:'Você já enviou uma denúncia pendente para este cartão.'},409);
      await db.prepare("INSERT INTO moderation_reports (id,reporter_id,card_id,reason,status,created_at) VALUES (?,?,?,?,'pending',?)").bind(crypto.randomUUID(),user.id,body.buddyId,reason,new Date().toISOString()).run();
      return json({ok:true});
    }
    if (body.action === 'listReports' || body.action === 'resolveReport' || body.action === 'restoreCard' || body.action === 'backupNow') {
      if (!env.FMDB_ADMIN_ID || String(user.id) !== env.FMDB_ADMIN_ID) return json({ok:false,error:'Acesso restrito à moderação.'},403);
      if (body.action === 'backupNow') {
        if (!env.FMDB_BACKUPS) return json({ok:false,error:'Armazenamento de backup indisponível.'},503);
        await backupCommunity(db,env.FMDB_BACKUPS); return json({ok:true});
      }
      if (body.action === 'listReports') {
        const reports=await db.prepare("SELECT r.id,r.card_id,r.reason,r.created_at,c.payload FROM moderation_reports r JOIN cards c ON c.id=r.card_id WHERE r.status='pending' ORDER BY r.created_at ASC LIMIT 100").all<{id:string;card_id:string;reason:string;created_at:string;payload:string}>();
        const hidden=await db.prepare('SELECT h.card_id,c.payload FROM hidden_cards h JOIN cards c ON c.id=h.card_id ORDER BY h.created_at DESC LIMIT 100').all<{card_id:string;payload:string}>();
        return json({ok:true,reports:reports.results,hidden:hidden.results});
      }
      if (body.action === 'restoreCard' && body.buddyId) { await db.batch([db.prepare('DELETE FROM hidden_cards WHERE card_id = ?').bind(body.buddyId), db.prepare("UPDATE cards SET payload=json_set(payload, '$.communityFollowsDone', (SELECT COUNT(*) FROM community_follows WHERE owner_id = cards.owner_id AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)))")]); return json({ok:true}); }
      if (body.action === 'resolveReport' && body.reportId && (body.decision === 'dismiss' || body.decision === 'hide')) {
        const report=await db.prepare("SELECT card_id FROM moderation_reports WHERE id = ? AND status = 'pending'").bind(body.reportId).first<{card_id:string}>();
        if (!report) return json({ok:false,error:'Denúncia não encontrada.'},404);
        const queries=[db.prepare("UPDATE moderation_reports SET status = ? WHERE id = ? AND status = 'pending'").bind(body.decision,body.reportId)];
        if (body.decision === 'hide') { queries.push(db.prepare('INSERT OR IGNORE INTO hidden_cards (card_id,moderator_id,created_at) VALUES (?,?,?)').bind(report.card_id,user.id,new Date().toISOString())); queries.push(db.prepare("UPDATE cards SET payload=json_set(payload, '$.communityFollowsDone', (SELECT COUNT(*) FROM community_follows WHERE owner_id = cards.owner_id AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)))")); }
        await db.batch(queries); return json({ok:true});
      }
      return json({ok:false,error:'Ação de moderação inválida.'},400);
    }
    if (body.action === 'followGithub' && typeof body.buddyId === 'string') {
      if (!session.user.canFollow) return json({ok:false,error:'Autorize a permissão para seguir perfis.'},403);
      const card = await db.prepare('SELECT payload FROM cards WHERE id = ?').bind(body.buddyId).first<{payload:string}>();
      const handle = card && sanitizeHandle((JSON.parse(card.payload) as DevBuddy).socials.github);
      if (!handle || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(handle)) return json({ok:false,error:'Perfil GitHub inválido.'},400);
      const result = await fetch(`https://api.github.com/user/following/${encodeURIComponent(handle)}`,{method:'PUT',headers:{Authorization:`Bearer ${session.token}`,Accept:'application/vnd.github+json','User-Agent':'FollowMyDevBuddies'}});
      return result.ok ? json({ok:true}) : json({ok:false,error:'Não foi possível seguir no GitHub.'},result.status===403||result.status===429 ? 429 : 502);
    }
    if (body.action === 'getProgress') {
      const records = await db.prepare('SELECT card_id, platform FROM community_follows WHERE owner_id = ? AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)').bind(user.id).all<{card_id:string; platform:string}>();
      return json({ ok: true, followed: Object.fromEntries(records.results.map(r => [`${r.card_id}:${r.platform}`, true])) });
    }
    if (body.action === 'setFollows') {
      const allowed = new Set(['instagram','tiktok','github','linkedin','twitter','youtube','bluesky','threads','twitch','gitlab','devto']);
      if (!Array.isArray(body.changes) || !body.changes.length || body.changes.length > 50 || body.changes.some(c => !c || typeof c.buddyId !== 'string' || c.buddyId.length > 80 || !allowed.has(c.platform) || typeof c.followed !== 'boolean')) return json({ok:false,error:'Dados de progresso inválidos.'},400);
      const statements = body.changes.map(c => c.followed
        ? db.prepare("INSERT OR IGNORE INTO community_follows (owner_id, card_id, platform) SELECT ?, id, ? FROM cards WHERE id = ? AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE card_id = cards.id) AND json_type(payload, '$.socials.' || ?) = 'text' AND length(trim(json_extract(payload, '$.socials.' || ?))) > 0").bind(user.id,c.platform,c.buddyId,c.platform,c.platform)
        : db.prepare('DELETE FROM community_follows WHERE owner_id = ? AND card_id = ? AND platform = ?').bind(user.id,c.buddyId,c.platform));
      statements.push(db.prepare("UPDATE cards SET payload=json_set(payload, '$.communityFollowsDone', (SELECT COUNT(*) FROM community_follows WHERE owner_id = ? AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id))) WHERE owner_id = ?").bind(user.id,user.id));
      await db.batch(statements);
      return json({ok:true});
    }
    if (body.action === "deleteAccount") {
      await db.batch([db.prepare('DELETE FROM fmdb_sessions WHERE owner_id = ?').bind(user.id), db.prepare('DELETE FROM moderation_reports WHERE reporter_id = ? OR card_id IN (SELECT id FROM cards WHERE owner_id = ?)').bind(user.id,user.id), db.prepare('DELETE FROM hidden_cards WHERE card_id IN (SELECT id FROM cards WHERE owner_id = ?)').bind(user.id), db.prepare('DELETE FROM community_follows WHERE owner_id = ? OR card_id IN (SELECT id FROM cards WHERE owner_id = ?)').bind(user.id,user.id), db.prepare("DELETE FROM cards WHERE owner_id = ?").bind(user.id), db.prepare("UPDATE cards SET payload=json_set(payload, '$.communityFollowsDone', (SELECT COUNT(*) FROM community_follows WHERE owner_id = cards.owner_id AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)))")]);
      let authorizationRevoked = false;
      try {
        const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/grant`, { method: 'DELETE', headers: { Authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'FollowMyDevBuddies' }, body: JSON.stringify({access_token: session.token}) });
        authorizationRevoked = response.status === 204;
      } catch { /* Account data is already deleted; user can revoke manually. */ }
      return json({ ok: true, buddies: await all(db), authorizationRevoked });
    }
    if (body.action === "delete" && typeof body.buddyId === "string") {
      const existing = await db.prepare("SELECT owner_id, payload FROM cards WHERE id = ?").bind(body.buddyId).first<{ owner_id: number; payload: string }>();
      if (!existing || existing.owner_id !== user.id) return json({ ok: false, error: "Você não pode excluir este cartão." }, 403);
      await db.batch([db.prepare('DELETE FROM moderation_reports WHERE card_id = ?').bind(body.buddyId), db.prepare('DELETE FROM hidden_cards WHERE card_id = ?').bind(body.buddyId), db.prepare('DELETE FROM community_follows WHERE card_id = ?').bind(body.buddyId), db.prepare("DELETE FROM cards WHERE id = ? AND owner_id = ?").bind(body.buddyId, user.id), db.prepare("UPDATE cards SET payload=json_set(payload, '$.communityFollowsDone', (SELECT COUNT(*) FROM community_follows WHERE owner_id = cards.owner_id AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)))")]);
      return json({ ok: true, buddies: await all(db) });
    }
    if (body.action === "upsert" && body.buddy) {
      const input = body.buddy;
      const isNew = !input.id || input.id.startsWith("new:");
      const existing = isNew ? null : await db.prepare("SELECT owner_id, payload FROM cards WHERE id = ?").bind(input.id).first<{ owner_id: number; payload: string }>();
      if (!isNew && (!existing || existing.owner_id !== user.id)) return json({ ok: false, error: "Você não pode editar este cartão." }, 403);
      const clean = sanitizeBuddy(input, user);
      if (!clean) return json({ ok: false, error: "Dados de perfil inválidos." }, 400);
      const previous = existing ? JSON.parse(existing.payload) as DevBuddy : null;
      // A URL returned by this API is a reference to the existing image, not a new upload.
      if (input.avatarUrl?.startsWith('/api/fmdb?avatar=')) {
        if (!previous || input.avatarUrl !== await publicAvatar(previous.id, previous.avatarUrl)) return json({ok:false,error:'Referência de foto inválida.'},400);
        clean.avatarUrl = previous.avatarUrl;
      } else if (input.avatarUrl?.startsWith('data:')) {
        if (!decodeAvatar(input.avatarUrl)) return json({ok:false,error:'Foto inválida ou acima de 48 KB. Envie JPG, PNG ou WebP.'},400);
        clean.avatarUrl = input.avatarUrl;
      } else clean.avatarUrl = await publicAvatar(clean.id, input.avatarUrl || '');
      const progress = await db.prepare('SELECT COUNT(*) AS total FROM community_follows WHERE owner_id = ? AND NOT EXISTS (SELECT 1 FROM hidden_cards WHERE hidden_cards.card_id = community_follows.card_id)').bind(user.id).first<{total:number}>();
      const card = { ...clean, id: existing ? input.id : `card-${crypto.randomUUID()}`, ownerGithubId: user.id,
        communityFollowsDone: Number(progress?.total || 0),
        socials: { ...clean.socials, github: sanitizeHandle(input.socials?.github) },
        tools: clean.tools ?? previous?.tools };
      await db.prepare("INSERT INTO cards (id, owner_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE cards.owner_id=excluded.owner_id")
        .bind(card.id, user.id, JSON.stringify(card)).run();
      return json({ ok: true, buddies: await all(db) });
    }
    if (body.action === "updateScore") return json({ ok: false, error: 'Atualize o portal para sincronizar seu progresso.' }, 409);
    return json({ ok: false, error: "Ação não reconhecida." }, 400);
  } catch { return json({ ok: false, error: "Não foi possível salvar. Tente novamente." }, 500); }
}
