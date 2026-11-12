export interface RankTier {
  level: number;
  id: string;
  title: string;
  minFollowed: number;
  minPercent: number;
  description: string;
  badgeClass: string;
  cardBorderClass: string;
  iconName: 'seedling' | 'zap' | 'rocket' | 'flame' | 'crown';
}

export const RANK_TIERS: RankTier[] = [
  {
    level: 1,
    id: 'starter',
    title: 'Membro da Comunidade',
    minFollowed: 0,
    minPercent: 0,
    description: 'Ponto de partida no portal Amigos do Mag.',
    badgeClass:
      'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300',
    cardBorderClass:
      'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/70',
    iconName: 'seedling',
  },
  {
    level: 2,
    id: 'connected',
    title: 'Dev Conectado',
    minFollowed: 3,
    minPercent: 15,
    description: 'Já deu os primeiros follows e iniciou o networking.',
    badgeClass:
      'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300',
    cardBorderClass:
      'border-sky-500/30 dark:border-sky-500/25 bg-white dark:bg-slate-900/75',
    iconName: 'zap',
  },
  {
    level: 3,
    id: 'booster',
    title: 'Booster de Algoritmo',
    minFollowed: 7,
    minPercent: 35,
    description: 'Impulsionando ativamente o alcance dos colegas devs.',
    badgeClass:
      'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300',
    cardBorderClass:
      'border-violet-500/35 dark:border-violet-500/30 bg-white dark:bg-slate-900/80',
    iconName: 'rocket',
  },
  {
    level: 4,
    id: 'ambassador',
    title: 'Embaixador Dev Buddy',
    minFollowed: 12,
    minPercent: 65,
    description: 'Referência de parceria! Segue a grande maioria da comunidade.',
    badgeClass:
      'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    cardBorderClass:
      'border-emerald-500/40 dark:border-emerald-500/35 bg-white dark:bg-slate-900/85 shadow-sm shadow-emerald-500/5',
    iconName: 'flame',
  },
  {
    level: 5,
    id: 'legend',
    title: 'Lenda Amigos do Mag',
    minFollowed: 18,
    minPercent: 90,
    description: 'Nível máximo! Conectado com quase 100% da comunidade.',
    badgeClass:
      'border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-800 dark:text-amber-300',
    cardBorderClass:
      'border-amber-500/45 bg-gradient-to-b from-amber-50/60 via-white to-white dark:from-amber-950/20 dark:via-slate-900/85 dark:to-slate-900/90 shadow-md shadow-amber-500/5',
    iconName: 'crown',
  },
];

/**
 * Calculates a user's rank based on how many networks they have followed
 * and/or the percentage of available community networks they follow.
 */
export function getRankByProgress(
  followedCount: number,
  totalAvailableLinks: number
): {
  currentTier: RankTier;
  nextTier: RankTier | null;
  followsNeededForNext: number;
} {
  const percent =
    totalAvailableLinks > 0
      ? Math.round((followedCount / totalAvailableLinks) * 100)
      : 0;

  let currentTier = RANK_TIERS[0];

  for (const tier of RANK_TIERS) {
    if (
      followedCount >= tier.minFollowed ||
      (totalAvailableLinks >= 5 && percent >= tier.minPercent && followedCount > 0)
    ) {
      currentTier = tier;
    }
  }

  const nextIndex = RANK_TIERS.findIndex((t) => t.level === currentTier.level) + 1;
  const nextTier = nextIndex < RANK_TIERS.length ? RANK_TIERS[nextIndex] : null;

  let followsNeededForNext = 0;
  if (nextTier) {
    const byCount = Math.max(1, nextTier.minFollowed - followedCount);
    const byPercent =
      totalAvailableLinks > 0
        ? Math.max(
            1,
            Math.ceil((nextTier.minPercent / 100) * totalAvailableLinks) -
              followedCount
          )
        : byCount;
    followsNeededForNext = Math.min(byCount, byPercent);
  }

  return {
    currentTier,
    nextTier,
    followsNeededForNext,
  };
}

