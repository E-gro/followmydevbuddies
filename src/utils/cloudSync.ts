import { DevBuddy } from '../types';

function getApiEndpoint(): string {
  if (typeof window === 'undefined') return '/api/fmdb';
  const host = window.location.hostname;
  if (host === 'pixelstd.com.br' || host.endsWith('.workers.dev')) {
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
  githubToken: string
): Promise<{ ok: boolean; buddies?: DevBuddy[]; error?: string }> {
  try {
    const res = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${githubToken}`,
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
  githubToken: string
): Promise<void> {
  if (!githubToken) return;
  try {
    await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${githubToken}`,
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
