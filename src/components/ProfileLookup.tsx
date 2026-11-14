import { useEffect, useState } from 'react';
import { extractCleanHandle } from '../utils/socialLinks';

type Status = 'checking' | 'found' | 'missing' | 'unavailable';
const cache = new Map<string, { status: Status; expires: number }>();

export function ProfileLookup({ platform, value }: { platform: 'github' | 'bluesky'; value: string }) {
  const [result, setResult] = useState<{ key: string; status: Status } | null>(null);
  const handle = extractCleanHandle(platform, value);
  const actor = platform === 'bluesky' && handle && !handle.includes('.') ? `${handle}.bsky.social` : handle;
  const key = `${platform}:${actor.toLowerCase()}`;
  useEffect(() => {
    if (!actor || (platform === 'github' && !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(actor)) || (platform === 'bluesky' && !/^[a-z\d][a-z\d.-]*\.[a-z]{2,}$/i.test(actor))) return;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) { setResult({ key, status: cached.status }); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResult({ key, status: 'checking' });
      const url = platform === 'github' ? `https://api.github.com/users/${encodeURIComponent(actor)}` : `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`;
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        let status: Status = response.ok ? 'found' : response.status === 404 && platform === 'github' ? 'missing' : 'unavailable';
        if (platform === 'bluesky' && response.status === 400) {
          const data = await response.json().catch(() => null) as { message?: string } | null;
          if (data?.message?.toLowerCase() === 'profile not found') status = 'missing';
        }
        if (controller.signal.aborted) return;
        if (status !== 'unavailable') { if (cache.size >= 100) cache.delete(cache.keys().next().value!); cache.set(key, { status, expires: Date.now() + 5 * 60 * 1000 }); }
        setResult({ key, status });
      } catch { if (!controller.signal.aborted) setResult({ key, status: 'unavailable' }); }
    }, 1200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [actor, key, platform]);
  if (!actor || result?.key !== key) return null;
  const labels: Record<Status, string> = { checking: 'Consultando perfil público…', found: 'Perfil encontrado. Isso não comprova que pertence a você.', missing: 'Perfil não encontrado. Confira o usuário.', unavailable: 'Não foi possível consultar agora. Você pode continuar.' };
  return <p role="status" className={`mt-1 text-[11px] ${result.status === 'missing' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{labels[result.status]}</p>;
}
