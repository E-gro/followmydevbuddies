import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { SocialIcon } from './SocialIcon';
import { extractCleanHandle } from '../utils/socialLinks';

export interface GitHubAuthUser {
  githubId: number;
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  blog: string;
  twitterUsername: string;
  accessToken?: string;
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
  const [usernameInput, setUsernameInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenField, setShowTokenField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = extractCleanHandle('github', usernameInput);
    const hasToken = Boolean(tokenInput.trim());

    if (!cleanUsername && !hasToken) {
      setError('Informe seu username do GitHub para autenticar seu perfil.');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      };
      if (hasToken) {
        headers.Authorization = `Bearer ${tokenInput.trim()}`;
      }

      // If token is provided, we can fetch the authenticated /user endpoint directly,
      // otherwise we fetch the public /users/:username endpoint for local prototype testing.
      const endpoint = hasToken
        ? 'https://api.github.com/user'
        : `https://api.github.com/users/${encodeURIComponent(cleanUsername)}`;

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        throw new Error(
          hasToken
            ? 'Token do GitHub inválido ou expirado.'
            : `Usuário "@${cleanUsername}" não encontrado no GitHub.`
        );
      }

      const data = await res.json();

      const authUser: GitHubAuthUser = {
        githubId: data.id,
        login: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
        bio: data.bio || '',
        company: data.company ? data.company.replace(/^@/, '') : '',
        blog: data.blog || '',
        twitterUsername: data.twitter_username || '',
        accessToken: hasToken ? tokenInput.trim() : undefined,
      };

      onSuccessAuth(authUser);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao conectar com a API do GitHub.'
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
                Entrar com GitHub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identidade única e gratuita para a comunidade Amigos do Mag
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

        {/* Security & Free API Explanation */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Por que login via GitHub?</span>
          </div>
          <ul className="text-slate-600 dark:text-slate-300 space-y-1 pl-5 list-disc text-[11px]">
            <li>
              <strong>Custo Zero de API:</strong> 5.000 requisições/hora gratuitas por usuário autenticado.
            </li>
            <li>
              <strong>1 Card por Dev:</strong> Seu card fica vinculado ao seu <code className="font-mono">@login</code> oficial, permitindo editar quando quiser.
            </li>
            <li>
              <strong>Cadastro Instantâneo:</strong> Puxa nome, bio, foto e site automaticamente.
            </li>
          </ul>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Seu Username do GitHub
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                github.com/
              </span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="seu-usuario"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2.5 pl-24 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Optional Token Accordion for 1-Click Follow */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-3">
            <button
              type="button"
              onClick={() => setShowTokenField((v) => !v)}
              className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
                <span>Opcional: Incluir Token para 1-Click Follow automático</span>
              </span>
              <span className="text-[10px] font-mono underline">
                {showTokenField ? 'Ocultar' : 'Expandir'}
              </span>
            </button>

            {showTokenField && (
              <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (escopo user:follow)"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">
                  Em produção com Supabase OAuth, esse token vem automaticamente no redirecionamento do botão "Sign in with GitHub".
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-5 py-3 text-xs font-bold text-white dark:text-slate-950 shadow-lg transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SocialIcon platform="github" className="h-4 w-4" />
            )}
            <span>Autenticar com GitHub & Sincronizar Card</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Lock className="h-3 w-3" />
          <span>Autenticação verificada diretamente na API oficial api.github.com</span>
        </div>
      </div>
    </div>
  );
};

