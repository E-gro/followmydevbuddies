import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { DevBuddy } from '../types';

export function GitHubConnectModal({ isOpen, onClose, githubToken, buddies, onBatchGithubFollow }: {
  isOpen: boolean; onClose: () => void; githubToken: string; onSaveToken: (token: string) => void;
  buddies: DevBuddy[]; onBatchGithubFollow: () => Promise<{ followed: number; failed: number }>;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="github-follow-title">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
      <div className="flex items-center justify-between"><h2 id="github-follow-title" className="text-lg font-bold">Conectar no GitHub</h2><button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button></div>
      <p className="text-sm text-slate-500">Siga os perfis da comunidade usando sua conta conectada ao GitHub.</p>
      {!githubToken ? <p className="text-sm">Entre com o GitHub para usar esta função.</p> : <button disabled={loading} onClick={async () => { setLoading(true); const r = await onBatchGithubFollow(); setResult(`${r.followed} perfis seguidos; ${r.failed} não puderam ser seguidos.`); setLoading(false); }} className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Seguir ${buddies.filter(b => b.socials.github).length} perfis`}</button>}
      <p role="status" className="text-sm">{result}</p>
    </div>
  </div>;
}
