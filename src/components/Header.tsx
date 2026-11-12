import React from 'react';
import {
  Users,
  Zap,
  UserPen,
  Sparkles,
  Crown,
  CheckCircle2,
  KeyRound,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { ThemeMode } from '../types';
import { GitHubAuthUser } from './GitHubAuthModal';
import { SocialIcon } from './SocialIcon';
import { FmdbLogo } from './FmdbLogo';

interface HeaderProps {
  totalBuddies: number;
  totalLinks: number;
  followedCount: number;
  hasGithubToken: boolean;
  authUser: GitHubAuthUser | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
  onOpenEditOwnProfile: () => void;
  onLogout: () => void;
  onOpenSpeedRun: () => void;
  onOpenGithubModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalBuddies,
  totalLinks,
  followedCount,
  hasGithubToken,
  authUser,
  theme,
  onToggleTheme,
  onOpenAuthModal,
  onOpenEditOwnProfile,
  onLogout,
  onOpenSpeedRun,
  onOpenGithubModal,
}) => {
  const pendingCount = Math.max(0, totalLinks - followedCount);

  return (
    <header className="relative border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#090B10]/90 backdrop-blur-xl transition-colors">
      {/* Ambient top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 max-w-4xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-indigo-500/15 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <FmdbLogo className="h-11 w-11 shrink-0 drop-shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Follow My Dev Buddies
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <Crown className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                  Amigos do Mag
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hub oficial de conexões da comunidade • Autenticado via GitHub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 p-2 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer"
              title={
                theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'
              }
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            <button
              onClick={onOpenGithubModal}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                hasGithubToken
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              title="Configurar 1-Click Follow automático no GitHub"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {hasGithubToken ? 'GitHub 1-Click Ativo' : '1-Click GitHub'}
              </span>
            </button>

            <button
              onClick={onOpenSpeedRun}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm transition-all hover:border-amber-400/60 hover:from-amber-500/25 hover:to-orange-500/25 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
              <span>Fila Rápida</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* GitHub Authenticated User Controls */}
            {authUser ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-slate-900/90 p-1 pl-2.5">
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.login}
                  className="h-6 w-6 rounded-full border border-emerald-500/40 object-cover"
                />
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  @{authUser.login}
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </span>
                <button
                  onClick={onOpenEditOwnProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  <UserPen className="h-3.5 w-3.5" />
                  <span>Meu Card</span>
                </button>
                <button
                  onClick={onLogout}
                  className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Sair da conta do GitHub"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-500 px-4 py-2 text-xs font-bold text-white dark:text-slate-950 shadow-lg shadow-emerald-500/15 transition-all hover:opacity-95 active:scale-[0.99] cursor-pointer"
              >
                <SocialIcon platform="github" className="h-4 w-4" />
                <span>Entrar com GitHub</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero banner */}
        <div className="py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              <span>Comunidade Amigos do Mag • Diretório Oficial de Devs</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Fortaleça o algoritmo dos seus{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                Dev Buddies
              </span>{' '}
              em segundos.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Entre com seu <strong className="text-slate-900 dark:text-slate-200 font-medium">GitHub</strong> para criar ou editar seu card a qualquer momento.
              Siga a galera no <strong className="text-slate-900 dark:text-slate-200 font-medium">Instagram, TikTok, GitHub e LinkedIn</strong> e suba de patente no ranking da comunidade!
            </p>
          </div>

          {/* Quick stats cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/90 dark:bg-slate-900/60 p-4 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Devs</span>
              </div>
              <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {totalBuddies}
              </p>
              <span className="text-[11px] text-slate-500">na comunidade</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/90 dark:bg-slate-900/60 p-4 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Redes</span>
              </div>
              <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {totalLinks}
              </p>
              <span className="text-[11px] text-slate-500">links seguros</span>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-4 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Seguidos</span>
              </div>
              <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {followedCount}
              </p>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-500/80">
                {totalLinks > 0 ? `${Math.round((followedCount / totalLinks) * 100)}% concluído` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
