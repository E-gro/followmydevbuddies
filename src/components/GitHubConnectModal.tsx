import React, { useState } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DevBuddy } from '../types';
import { extractCleanHandle } from '../utils/socialLinks';
import { SocialIcon } from './SocialIcon';

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
  onSaveToken: (token: string) => void;
  buddies: DevBuddy[];
  onBatchGithubFollow: () => Promise<{ followed: number; failed: number }>;
}

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({
  isOpen,
  onClose,
  githubToken,
  onSaveToken,
  buddies,
  onBatchGithubFollow,
}) => {
  const [inputToken, setInputToken] = useState(githubToken);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const githubBuddiesCount = buddies.filter(
    (b) => b.socials.github && extractCleanHandle('github', b.socials.github)
  ).length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(inputToken.trim());
    setBatchResult('Token salvo localmente no seu navegador!');
  };

  const handleBatchFollow = async () => {
    if (!inputToken.trim()) return;
    onSaveToken(inputToken.trim());
    setBatchLoading(true);
    setBatchResult(null);
    const res = await onBatchGithubFollow();
    setBatchLoading(false);
    setBatchResult(
      `Concluído! ${res.followed} perfis do GitHub seguidos automaticamente via API${
        res.failed > 0 ? ` (${res.failed} falhas)` : '!'
      }`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D111A] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <SocialIcon platform="github" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                1-Click Follow Real no GitHub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A API oficial do GitHub permite seguir todos os devs com 1 botão sem risco de ban
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

        {/* Info box */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Como funciona? (100% Client-Side)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            Diferente do Instagram e LinkedIn (que bloqueiam automação de follow), o GitHub possui o endpoint oficial{' '}
            <code className="text-emerald-600 dark:text-emerald-300 font-semibold">PUT /user/following/:username</code>.
            Com um Personal Access Token com a permissão <code className="text-emerald-600 dark:text-emerald-300 font-semibold">user:follow</code>, você segue qualquer dev da comunidade com 1 clique real.
          </p>
          <a
            href="https://github.com/settings/tokens/new?description=FollowMyDevBuddies-AmigosDoMag&scopes=user:follow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-medium pt-1"
          >
            <span>Gerar token rápido no GitHub (escopo user:follow já marcado)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Token Input */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              GitHub Personal Access Token (salvo apenas no seu LocalStorage)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>

        {/* 1-Click Follow All GitHubs */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <button
            type="button"
            disabled={!inputToken.trim() || batchLoading}
            onClick={handleBatchFollow}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 disabled:opacity-40 cursor-pointer"
          >
            {batchLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 fill-slate-950" />
            )}
            <span>
              Seguir Todos os {githubBuddiesCount} GitHubs da Comunidade Agora (1-Click)
            </span>
          </button>

          {batchResult && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{batchResult}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
