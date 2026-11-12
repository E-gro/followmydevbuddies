import React from 'react';
import { Sprout, Zap, Rocket, Flame, Crown } from 'lucide-react';
import { RankTier } from '../utils/ranking';

interface RankBadgeProps {
  tier: RankTier;
  size?: 'sm' | 'md';
  showLevel?: boolean;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  tier,
  size = 'sm',
  showLevel = false,
}) => {
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  const renderIcon = () => {
    switch (tier.iconName) {
      case 'seedling':
        return <Sprout className={`${iconClass} text-emerald-500`} />;
      case 'zap':
        return <Zap className={`${iconClass} text-sky-500 dark:text-sky-400`} />;
      case 'rocket':
        return <Rocket className={`${iconClass} text-violet-500 dark:text-violet-400`} />;
      case 'flame':
        return <Flame className={`${iconClass} text-emerald-500 dark:text-emerald-400`} />;
      case 'crown':
        return <Crown className={`${iconClass} text-amber-500 dark:text-amber-400`} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      } ${tier.badgeClass}`}
      title={`Nível ${tier.level}: ${tier.title} — ${tier.description}`}
    >
      {renderIcon()}
      {showLevel && <span className="font-mono opacity-75">Nv.{tier.level}</span>}
      <span>{tier.title}</span>
    </span>
  );
};

