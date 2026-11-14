import { X, ShieldCheck } from 'lucide-react';
import { SocialIcon } from './SocialIcon';

export interface GitHubAuthUser {
  githubId: number;
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  blog: string;
  twitterUsername: string;
  accessToken: string;
}

export function GitHubAuthModal({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAuth: (user: GitHubAuthUser) => void;
}) {
  if (!isOpen) return null;
  const origin = window.location.hostname === 'fmdb.pixelstd.com.br' || window.location.hostname === 'pixelstd.com.br'
    ? '' : 'https://fmdb.pixelstd.com.br';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="github-auth-title">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D111A] p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between"><h2 id="github-auth-title" className="text-lg font-bold">Entrar com GitHub</h2><button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button></div>
      <p className="text-sm text-slate-600 dark:text-slate-300">Conecte sua conta para publicar seu perfil e compartilhar as ferramentas que você usa. Você será redirecionado ao GitHub para autorizar o acesso.</p>
      <p className="flex gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />O GitHub mostrará as permissões solicitadas antes de você confirmar.</p>
      <a href={`${origin}/api/fmdb/auth`} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-5 py-3 text-sm font-bold text-white dark:text-slate-950"><SocialIcon platform="github" className="h-4 w-4" />Continuar com GitHub</a>
    </div>
  </div>;
}
