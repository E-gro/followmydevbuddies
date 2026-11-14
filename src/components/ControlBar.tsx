import React, { useState } from 'react';
import {
  Search,
  Smartphone,
  MousePointerClick,
  CheckCheck,
  Clock,
  Layers,
  X,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FollowStatusFilter, SocialPlatform } from '../types';
import { PLATFORMS } from '../utils/socialLinks';
import { RANK_TIERS, getRankByProgress } from '../utils/ranking';
import { RankBadge } from './RankBadge';
import { SocialIcon } from './SocialIcon';

interface ControlBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPlatform: SocialPlatform | 'all';
  onPlatformChange: (p: SocialPlatform | 'all') => void;
  statusFilter: FollowStatusFilter;
  onStatusFilterChange: (s: FollowStatusFilter) => void;
  autoMarkOnClick: boolean;
  onToggleAutoMark: () => void;
  useMobileDeepLink: boolean;
  onToggleMobileDeepLink: () => void;
  platformCounts: Record<string, number>;
  totalLinks: number;
  followedCount: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  statusFilter,
  onStatusFilterChange,
  autoMarkOnClick,
  onToggleAutoMark,
  useMobileDeepLink,
  onToggleMobileDeepLink,
  platformCounts,
  totalLinks,
  followedCount,
}) => {
  const [showRankTable, setShowRankTable] = useState(false);

  const progressPercent =
    totalLinks > 0
      ? Math.min(100, Math.round((followedCount / totalLinks) * 100))
      : 0;

  const { currentTier, nextTier, followsNeededForNext } = getRankByProgress(
    followedCount,
    totalLinks
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
      {/* Gamified Ranking + Progress + Automation Toggles Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/60 p-4 sm:p-5 shadow-sm dark:shadow-none backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Ranking & Progress indicator */}
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Seu Ranking Atual:
                </span>
                <RankBadge tier={currentTier} size="md" showLevel />
                <button
                  type="button"
                  onClick={() => setShowRankTable((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <Trophy className="h-3 w-3 text-amber-500" />
                  <span>Ver Patentes</span>
                  {showRankTable ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-400">
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {followedCount}
                  </strong>{' '}
                  / {totalLinks} seguidos ({progressPercent}%)
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/90 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{currentTier.description}</span>
              {nextTier ? (
                <span>
                  Siga mais{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {followsNeededForNext} {followsNeededForNext === 1 ? 'rede' : 'redes'}
                  </strong>{' '}
                  para subir para <strong className="text-slate-800 dark:text-slate-200">{nextTier.title}</strong>
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  👑 Patente Máxima Alcançada!
                </span>
              )}
            </div>
          </div>

          {/* Smart 1-Click Toggles */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 lg:pl-6 lg:border-l lg:border-slate-200 dark:lg:border-slate-800">
            <button
              type="button"
              onClick={onToggleAutoMark}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                autoMarkOnClick
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Quando ativado, clicar no botão de abrir uma rede social já marca automaticamente como 'Seguindo' para economizar cliques."
            >
              <MousePointerClick className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>1-Click: Abrir + Marcar</span>
              <span
                className={`ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                  autoMarkOnClick
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {autoMarkOnClick ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleMobileDeepLink}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                useMobileDeepLink
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Usa links nativos (instagram://, tiktok, twitter://) para abrir direto dentro do aplicativo no celular sem passar pelo navegador."
            >
              <Smartphone className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Deep-Link App Nativo</span>
              <span
                className={`ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                  useMobileDeepLink
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {useMobileDeepLink ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Ranking Tiers Showcase */}
        {showRankTable && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
              Sistema de Patentes da Comunidade (evolua seguindo mais devs):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {RANK_TIERS.map((tier) => {
                const isCurrent = tier.level === currentTier.level;
                const isUnlocked = tier.level <= currentTier.level;
                return (
                  <div
                    key={tier.id}
                    className={`rounded-xl border p-3 transition-all ${
                      isCurrent
                        ? 'border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-950/25 ring-1 ring-emerald-500/30'
                        : isUnlocked
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80'
                        : 'border-slate-200/60 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-950/40 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        NÍVEL {tier.level}
                      </span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        {tier.minFollowed === 0
                          ? 'Inicial'
                          : `${tier.minFollowed}+ follows (${tier.minPercent}%)`}
                      </span>
                    </div>
                    <RankBadge tier={tier} size="sm" />
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {tier.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar dev por nome, @arroba, empresa ou stack (ex: React, IA, SaaS)..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 py-2.5 pl-10 pr-9 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-xs dark:shadow-none focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-1 shrink-0 shadow-xs dark:shadow-none [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2">
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Todos</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('pending')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span>Falta Seguir</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('completed')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Já Seguidos</span>
          </button>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onPlatformChange('all')}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedPlatform === 'all'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
              : 'border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Todas as Redes</span>
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
            {totalLinks}
          </span>
        </button>

        {PLATFORMS.map((platform) => {
          const count = platformCounts[platform.id] || 0;
          if (count === 0) return null;
          const isSelected = selectedPlatform === platform.id;

          return (
            <button
              key={platform.id}
              onClick={() => onPlatformChange(platform.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? platform.borderActiveClass
                  : 'border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SocialIcon platform={platform.id} className={`h-3.5 w-3.5 ${platform.colorClass}`} />
              <span>{platform.label}</span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
