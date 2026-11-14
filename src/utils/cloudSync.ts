import { DevBuddy, FollowedMap, SocialPlatform } from '../types';
import type { GitHubAuthUser } from '../components/GitHubAuthModal';

function getApiEndpoint(): string {
  if (typeof window === 'undefined') return '/api/fmdb';
  const host = window.location.hostname;
  if (host === 'pixelstd.com.br' || host === 'fmdb.pixelstd.com.br' || host.endsWith('.workers.dev')) {
    return '/api/fmdb';
  }
  return 'https://pixelstd.com.br/api/fmdb';
}

export async function fetchCloudBuddies(): Promise<DevBuddy[] | null> {
  try {
    const res = await fetch(getApiEndpoint(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && Array.isArray(data.buddies)) {
      return data.buddies as DevBuddy[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function upsertCloudBuddy(
  buddy: DevBuddy,
  _githubToken: string
): Promise<{ ok: boolean; buddies?: DevBuddy[]; error?: string }> {
  try {
    const res = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'upsert', buddy }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || 'Falha de autenticação ao salvar no servidor.',
      };
    }
    return { ok: true, buddies: data.buddies as DevBuddy[] };
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor.' };
  }
}

export async function syncCloudFollowScore(
  buddyId: string,
  communityFollowsDone: number,
  _githubToken: string
): Promise<void> {
  try {
    await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        action: 'updateScore',
        buddyId,
        communityFollowsDone,
      }),
    });
  } catch {
    // ignore offline errors
  }
}

export async function deleteCloudBuddy(buddyId: string, _githubToken: string): Promise<{ ok: boolean; buddies?: DevBuddy[]; error?: string }> {
  try {
    const response = await fetch(getApiEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ action: 'delete', buddyId }) });
    return await response.json();
  } catch { return { ok: false, error: 'Erro de conexão com o servidor.' }; }
}

export async function deleteCloudAccount(_githubToken: string): Promise<{ ok: boolean; buddies?: DevBuddy[]; error?: string; authorizationRevoked?: boolean }> {
  try {
    const response = await fetch(getApiEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ action: 'deleteAccount' }) });
    return await response.json();
  } catch { return { ok: false, error: 'Erro de conexão com o servidor.' }; }
}

export async function getCloudProgress(_token: string): Promise<FollowedMap | null> {
  try {
    const response = await fetch(getApiEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getProgress' }) });
    const data = await response.json();
    return response.ok && data.ok && data.followed && typeof data.followed === 'object' ? data.followed : null;
  } catch { return null; }
}

export async function updateCloudProgress(_token: string, changes: { buddyId: string; platform: SocialPlatform; followed: boolean }[]): Promise<boolean> {
  try {
    const response = await fetch(getApiEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setFollows', changes }) });
    return response.ok;
  } catch { return false; }
}

export async function getCloudSession(): Promise<GitHubAuthUser | null> {
  try { const response = await fetch(`${getApiEndpoint()}/session`, { cache: 'no-store' }); const data = await response.json(); return response.ok && data.user ? { ...data.user, accessToken: 'session' } : null; } catch { return null; }
}
export async function endCloudSession(): Promise<boolean> {
  try { return (await fetch(`${getApiEndpoint()}/session`, { method: 'POST' })).ok; } catch { return false; }
}
export async function followCloudGithub(buddyId: string): Promise<boolean> {
  try { return (await fetch(getApiEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'followGithub', buddyId }) })).ok; } catch { return false; }
}
export interface ModerationItem { id: string; card_id: string; reason: string; created_at: string; payload: string }
export interface HiddenItem { card_id: string; payload: string }
export async function moderationRequest(body: Record<string, unknown>): Promise<{ok:boolean;error?:string;reports?:ModerationItem[];hidden?:HiddenItem[]}> {
  try { const response=await fetch(getApiEndpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return await response.json(); } catch { return {ok:false,error:'Erro de conexão.'}; }
}
