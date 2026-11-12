import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Lock,
  ExternalLink,
} from 'lucide-react';
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

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessAuth: (user: GitHubAuthUser) => void;
}

export const GitHubAuthModal: React.FC<GitHubAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessAuth,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOAuthRedirect = () => {
    const base =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'pixelstd.com.br' ||
        window.location.hostname.endsWith('.workers.dev'))
        ? '/api/fmdb/auth'
        : 'https://pixelstd.com.br/api/fmdb/auth';
    window.location.href = base;
  };

  const handleAuthenticateWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setError('Cole seu token de acesso do GitHub para autenticar sua conta.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${cleanToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(
          'Token inválido ou expirado. Gere um novo token no botão acima.'
        );
      }

      const data = await res.json();
      if (!data || !data.id || !data.login) {
        throw new Error('Não foi possível validar sua identidade no GitHub.');
      }

      const authUser: GitHubAuthUser = {
        githubId: data.id,
        login: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
        bio: data.bio || '',
        company: data.company ? data.company.replace(/^@/, '') : '',
        blog: data.blog || '',
        twitterUsername: data.twitter_username || '',
        accessToken: cleanToken,
      };

      onSuccessAuth(authUser);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao validar token na API oficial do GitHub.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D111A] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950">
              <SocialIcon platform="github" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Autenticar com GitHub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verificação real de identidade • Impede falsificação de perfil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security explanation */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Identidade Criptográfica Verificada</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
            O servidor valida seu token diretamente no endpoint autenticado{' '}
            <code className="font-mono text-emerald-600 dark:text-emerald-400">
              api.github.com/user
            </code>
            . Assim, <strong>ninguém pode usar o @username de outra pessoa</strong> nem alterar cards alheios, e você já ganha o <strong>1-Click Follow</strong> automático no GitHub.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Option 1: OAuth Redirect */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleOAuthRedirect}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-900 dark:bg-white px-5 py-3 text-xs font-bold text-white dark:text-slate-950 shadow-md transition-all hover:opacity-90 cursor-pointer"
          >
            <SocialIcon platform="github" className="h-4 w-4" />
            <span>Entrar via GitHub OAuth (Redirecionamento)</span>
          </button>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          <span className="mx-3 shrink-0 text-[11px] font-medium text-slate-400">
            ou autentique com Chave de Acesso (1-Click Follow incluso)
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Option 2: Direct Verified Token Auth */}
        <form onSubmit={handleAuthenticateWithToken} className="space-y-3.5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
                <span>Passo 1: Gerar chave oficial no GitHub</span>
              </span>
              <a
                href="https://github.com/settings/tokens/new?description=FollowMyDevBuddies-AmigosDoMag&scopes=read:user,user:follow"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
              >
                <span>Gerar no GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Passo 2: Cole o token gerado (<code className="font-mono">ghp_...</code>)
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/15 transition-all hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              <span>Validar Token & Entrar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock className="h-3 w-3" />
          <span>Validado no servidor via Authorization Bearer em api.github.com/user</span>
        </div>
      </div>
    </div>
  );
};
