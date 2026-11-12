import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  ExternalLink,
  Check,
  SkipForward,
  PartyPopper,
  Smartphone,
} from 'lucide-react';
import { DevBuddy, FollowedMap, SocialPlatform } from '../types';
import {
  FOLLOWABLE_PLATFORMS,
  buildSocialUrl,
  formatDisplayHandle,
} from '../utils/socialLinks';
import { SocialIcon } from './SocialIcon';

interface SpeedRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  buddies: DevBuddy[];
  followedMap: FollowedMap;
  useMobileDeepLink: boolean;
  onToggleMobileDeepLink: () => void;
  onMarkFollowed: (buddyId: string, platform: SocialPlatform) => void;
}

interface QueueItem {
  buddy: DevBuddy;
  platform: SocialPlatform;
  platformLabel: string;
  colorClass: string;
  rawValue: string;
}

export const SpeedRunModal: React.FC<SpeedRunModalProps> = ({
  isOpen,
  onClose,
  buddies,
  followedMap,
  useMobileDeepLink,
  onToggleMobileDeepLink,
  onMarkFollowed,
}) => {
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | 'all'>('all');
  const [skippedKeys, setSkippedKeys] = useState<Record<string, boolean>>({});

  const pendingQueue = useMemo(() => {
    const items: QueueItem[] = [];
    for (const buddy of buddies) {
      for (const p of FOLLOWABLE_PLATFORMS) {
        if (filterPlatform !== 'all' && filterPlatform !== p.id) continue;
        const val = buddy.socials[p.id];
        if (!val || !val.trim()) continue;
        const key = `${buddy.id}:${p.id}`;
        if (followedMap[key] || skippedKeys[key]) continue;

        items.push({
          buddy,
          platform: p.id,
          platformLabel: p.label,
          colorClass: p.colorClass,
          rawValue: val,
        });
      }
    }
    return items;
  }, [buddies, followedMap, filterPlatform, skippedKeys]);

  if (!isOpen) return null;

  const currentItem = pendingQueue[0];

  const handleOpenAndMark = () => {
    if (!currentItem) return;
    const url = buildSocialUrl(
      currentItem.platform,
      currentItem.rawValue,
      useMobileDeepLink
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    onMarkFollowed(currentItem.buddy.id, currentItem.platform);
  };

  const handleJustMark = () => {
    if (!currentItem) return;
    onMarkFollowed(currentItem.buddy.id, currentItem.platform);
  };

  const handleSkip = () => {
    if (!currentItem) return;
    const key = `${currentItem.buddy.id}:${currentItem.platform}`;
    setSkippedKeys((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D111A] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
              <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Fila Rápida de Follow (Speed-Run)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Siga a galera da Amigos do Mag em sequência com 1 clique por perfil
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

        {/* Network Filter Pills */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setFilterPlatform('all');
              setSkippedKeys({});
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
              filterPlatform === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas
          </button>
          {FOLLOWABLE_PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setFilterPlatform(p.id);
                setSkippedKeys({});
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                filterPlatform === p.id
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SocialIcon platform={p.id} className="h-3 w-3" />
              <span>{p.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Queue Card or Empty State */}
        <div className="mt-4">
          {currentItem ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-5 space-y-5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Próximo da fila:</span>
                <span className="font-mono text-amber-600 dark:text-amber-300 font-semibold">
                  Restam {pendingQueue.length} conexões pendentes
                </span>
              </div>

              {/* Buddy Summary */}
              <div className="flex items-center gap-4">
                <img
                  src={currentItem.buddy.avatarUrl}
                  alt={currentItem.buddy.name}
                  className="h-16 w-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                    {currentItem.buddy.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentItem.buddy.role}
                    {currentItem.buddy.companyOrProject
                      ? ` • ${currentItem.buddy.companyOrProject}`
                      : ''}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950 px-3 py-1">
                    <SocialIcon
                      platform={currentItem.platform}
                      className={`h-4 w-4 ${currentItem.colorClass}`}
                    />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {currentItem.platformLabel}:
                    </span>
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {formatDisplayHandle(currentItem.platform, currentItem.rawValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary 1-Click Action */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleOpenAndMark}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                >
                  <span>Abrir {currentItem.platformLabel} & Marcar Seguido</span>
                  <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleJustMark}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Já sigo (Só Marcar)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    <span>Pular por agora</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/15 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <PartyPopper className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Fila zerada! Tudo em dia!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Você já seguiu ou revisou todos os perfis disponíveis para este filtro na comunidade Amigos do Mag.
              </p>
              {Object.keys(skippedKeys).length > 0 && (
                <button
                  onClick={() => setSkippedKeys({})}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Revisar {Object.keys(skippedKeys).length} pulados
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Dica: No celular, ative o Deep-Link para abrir direto no app.</span>
          <button
            type="button"
            onClick={onToggleMobileDeepLink}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium cursor-pointer ${
              useMobileDeepLink
                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Smartphone className="h-3 w-3" />
            <span>Deep-Link: {useMobileDeepLink ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
