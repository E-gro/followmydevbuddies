import { DevBuddy } from '../types';

function getApiEndpoint(): string {
  if (typeof window === 'undefined') return '/api/fmdb';
  const host = window.location.hostname;
  if (host === 'pixelstd.com.br' || host.endsWith('.workers.dev')) {
    return '/api/fmdb';
  }
  // When running on localhost, try local /api/fmdb or fallback to production API
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
    if (data && Array.isArray(data.buddies) && data.buddies.length > 0) {
      return data.buddies as DevBuddy[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function upsertCloudBuddy(
  buddy: DevBuddy
): Promise<DevBuddy[] | null> {
  try {
    const res = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'upsert', buddy }),
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

export async function syncCloudFollowScore(
  buddyId: string,
  communityFollowsDone: number
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
