import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  CheckCheck,
  Loader2,
  Zap,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { DevBuddy, FollowedMap, SocialPlatform } from '../types';
import {
  PLATFORMS,
  buildSocialUrl,
  formatDisplayHandle,
  extractCleanHandle,
} from '../utils/socialLinks';
import { getRankByProgress } from '../utils/ranking';
import { RankBadge } from './RankBadge';
import { SocialIcon } from './SocialIcon';

interface BuddyCardProps {
  buddy: DevBuddy;
  isOwnCard: boolean;
  userFollowedCount: number;
  totalCommunityLinks: number;
  followedMap: FollowedMap;
  selectedPlatform: SocialPlatform | 'all';
  autoMarkOnClick: boolean;
  useMobileDeepLink: boolean;
  githubToken: string;
  onToggleFollow: (buddyId: string, platform: SocialPlatform, forceState?: boolean) => void;
  onMarkAllForBuddy: (buddy: DevBuddy, targetState: boolean) => void;
  onGithubApiFollow: (buddyId: string, githubUsername: string) => Promise<boolean>;
  onEditBuddy: (buddy: DevBuddy) => void;
}

export const BuddyCard: React.FC<BuddyCardProps> = ({
  buddy,
  isOwnCard,
  userFollowedCount,
  totalCommunityLinks,
  followedMap,
  selectedPlatform,
  autoMarkOnClick,
  useMobileDeepLink,
  githubToken,
  onToggleFollow,
  onMarkAllForBuddy,
  onGithubApiFollow,
  onEditBuddy,
}) => {
  const [loadingGithub, setLoadingGithub] = useState(false);

  // If this is the user's own card, their rank dynamically reflects how many links they've followed!
  const effectiveFollowsDone = isOwnCard
    ? userFollowedCount
    : buddy.communityFollowsDone || 0;

  const { currentTier } = getRankByProgress(
    effectiveFollowsDone,
    totalCommunityLinks
  );

  const availablePlatforms = PLATFORMS.filter((p) => {
    const val = buddy.socials[p.id];
    if (!val || !val.trim()) return false;
    if (selectedPlatform !== 'all' && selectedPlatform !== p.id) return false;
    return true;
  });

  const allBuddyPlatforms = PLATFORMS.filter((p) => {
    const val = buddy.socials[p.id];
    return Boolean(val && val.trim());
  });

  const followedForBuddyCount = allBuddyPlatforms.filter(
    (p) => followedMap[`${buddy.id}:${p.id}`]
  ).length;

  const isAllFollowed =
    allBuddyPlatforms.length > 0 && followedForBuddyCount === allBuddyPlatforms.length;

  const handleSocialClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    platform: SocialPlatform,
    rawValue: string
  ) => {
    if (platform === 'github' && githubToken.trim()) {
      e.preventDefault();
      const username = extractCleanHandle('github', rawValue);
      if (!username) return;
      setLoadingGithub(true);
      const ok = await onGithubApiFollow(buddy.id, username);
      setLoadingGithub(false);
      if (!ok) {
        window.open(buildSocialUrl('github', rawValue, false), '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (autoMarkOnClick) {
      onToggleFollow(buddy.id, platform, true);
    }
  };

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 shadow-xs dark:shadow-none ${
        isOwnCard
          ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-slate-900/85 ring-1 ring-emerald-500/20'
          : isAllFollowed
          ? 'border-emerald-500/30 bg-white/75 dark:bg-slate-900/45'
          : `${currentTier.cardBorderClass} hover:border-slate-300 dark:hover:border-slate-700/90 hover:shadow-md dark:hover:bg-slate-900/90`
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Rank Badge & Actions row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <RankBadge tier={currentTier} size="sm" />
            {isOwnCard && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                Você
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Edit card button — strictly only for the authenticated owner of this card */}
            {isOwnCard && (
              <button
                type="button"
                onClick={() => onEditBuddy(buddy)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer"
                title="Editar informações, avatar ou links do seu card"
              >
                <Pencil className="h-2.5 w-2.5" />
                <span>Editar</span>
              </button>
            )}

            {/* Buddy completion pill */}
            <button
              type="button"
              onClick={() => onMarkAllForBuddy(buddy, !isAllFollowed)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-mono transition-all cursor-pointer ${
                isAllFollowed
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              title={
                isAllFollowed
                  ? 'Desmarcar todas as redes deste dev'
                  : 'Marcar que já sigo todas as redes deste dev'
              }
            >
              <CheckCheck className="h-3 w-3" />
              <span>
                {followedForBuddyCount}/{allBuddyPlatforms.length}
              </span>
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex items-start gap-3.5">
          <img
            src={buddy.avatarUrl}
            alt={buddy.name}
            className={`h-14 w-14 rounded-2xl object-cover border shrink-0 bg-slate-100 dark:bg-slate-800 ${
              currentTier.level === 5
                ? 'border-amber-400/60'
                : 'border-slate-200 dark:border-slate-700/80'
            }`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{buddy.name}</span>
              {isAllFollowed && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              )}
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
              {buddy.role}
              {buddy.companyOrProject && (
                <span className="text-slate-400 dark:text-slate-500">
                  {' '}
                  • {buddy.companyOrProject}
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {buddy.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-slate-950/60 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {buddy.bio && (
          <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
            {buddy.bio}
          </p>
        )}
      </div>

      {/* Social Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/70 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
          <span
            className="inline-flex items-center gap-1"
            title="Todos os links passam por validação de domínio oficial anti-phishing"
          >
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Redes ({availablePlatforms.length})
          </span>
          <span className="font-mono text-[10px]">
            Seguiu {effectiveFollowsDone} {effectiveFollowsDone === 1 ? 'rede' : 'redes'} da comunidade
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availablePlatforms.map((platform) => {
            const rawVal = buddy.socials[platform.id] || '';
            const isFollowed = Boolean(followedMap[`${buddy.id}:${platform.id}`]);
            const url = buildSocialUrl(platform.id, rawVal, useMobileDeepLink);
            const displayHandle = formatDisplayHandle(platform.id, rawVal);
            const isGithub1Click = platform.id === 'github' && Boolean(githubToken.trim());

            return (
              <div
                key={platform.id}
                className={`flex items-center rounded-xl border transition-all overflow-hidden ${
                  isFollowed
                    ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Main Open / Follow Link */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleSocialClick(e, platform.id, rawVal)}
                  className="flex flex-1 items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/40 min-w-0"
                  title={
                    isGithub1Click
                      ? `Dar 1-Click Follow direto via API do GitHub em ${displayHandle}`
                      : `Abrir link oficial verificado: ${url}`
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SocialIcon
                      platform={platform.id}
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isFollowed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : platform.colorClass
                      }`}
                    />
                    <div className="truncate">
                      <span
                        className={`block truncate text-[11px] font-semibold ${
                          isFollowed
                            ? 'text-emerald-900 dark:text-emerald-200'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {platform.shortLabel}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {displayHandle}
                      </span>
                    </div>
                  </div>

                  {platform.id === 'github' && loadingGithub ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
                  ) : isGithub1Click && !isFollowed ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                      <Zap className="h-2.5 w-2.5" />
                      1-Click
                    </span>
                  ) : (
                    <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                  )}
                </a>

                {/* Manual Check / Uncheck Button */}
                <button
                  type="button"
                  onClick={() => onToggleFollow(buddy.id, platform.id)}
                  className={`flex h-full items-center justify-center border-l px-2.5 py-2 transition-colors cursor-pointer ${
                    isFollowed
                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={
                    isFollowed
                      ? 'Já seguindo (clique para desmarcar)'
                      : 'Marcar como já seguido'
                  }
                >
                  <Check
                    className={`h-3.5 w-3.5 ${
                      isFollowed ? 'stroke-[2.8]' : 'stroke-[2]'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
};
