import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DevBuddy,
  FollowedMap,
  FollowStatusFilter,
  SocialPlatform,
  ThemeMode,
} from './types';
import { INITIAL_BUDDIES } from './data/initialBuddies';
import { PLATFORMS, FOLLOWABLE_PLATFORMS, extractCleanHandle } from './utils/socialLinks';
import {
  fetchCloudBuddies,
  upsertCloudBuddy,
  getCloudProgress,
  updateCloudProgress,
  deleteCloudBuddy,
  deleteCloudAccount,
  getCloudSession,
  endCloudSession,
  followCloudGithub,
  moderationRequest,
  ModerationItem,
  HiddenItem,
} from './utils/cloudSync';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { BuddyCard } from './components/BuddyCard';
import { AddBuddyModal } from './components/AddBuddyModal';
import { SpeedRunModal } from './components/SpeedRunModal';
import { GitHubConnectModal } from './components/GitHubConnectModal';
import { GitHubAuthModal, GitHubAuthUser } from './components/GitHubAuthModal';
import { FmdbLogo } from './components/FmdbLogo';
import { CommunityTools } from './components/CommunityTools';
import {
  Sparkles,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
  Cloud,
} from 'lucide-react';

const STORAGE_KEYS = {
  BUDDIES: 'fmdb_buddies_v4_clean',
  FOLLOWED: 'fmdb_followed_v2_clean',
  AUTO_MARK: 'fmdb_automark_v1',
  MOBILE_DEEPLINK: 'fmdb_deeplink_v1',
  GH_TOKEN: 'fmdb_gh_token_v1',
  THEME: 'fmdb_theme_v1',
  OWN_ID: 'fmdb_own_buddy_id_v2',
  AUTH_USER: 'fmdb_gh_auth_user_v2',
};

export function App() {
  const [toolsPage, setToolsPage] = useState(() => window.location.hash === '#ferramentas');
  useEffect(() => {
    const update = () => setToolsPage(window.location.hash === '#ferramentas');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [authUser, setAuthUser] = useState<GitHubAuthUser | null>(null);

  const [buddies, setBuddies] = useState<DevBuddy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUDDIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_BUDDIES;
  });

  const [cloudSynced, setCloudSynced] = useState(false);

  const [ownBuddyId, setOwnBuddyId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.OWN_ID) || '';
  });

  const [followedMap, setFollowedMap] = useState<FollowedMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FOLLOWED);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [progressReady, setProgressReady] = useState(false);
  const progressBusy = useRef(false);

  const [autoMarkOnClick, setAutoMarkOnClick] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_MARK);
    return saved !== null ? saved === 'true' : true;
  });

  const [useMobileDeepLink, setUseMobileDeepLink] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOBILE_DEEPLINK);
    return saved === 'true';
  });

  const [githubToken, setGithubToken] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FollowStatusFilter>('all');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCardsMenuOpen, setIsCardsMenuOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [reports, setReports] = useState<ModerationItem[]>([]);
  const [hiddenCards, setHiddenCards] = useState<HiddenItem[]>([]);
  const [editingBuddy, setEditingBuddy] = useState<DevBuddy | null>(null);
  const [isSpeedRunOpen, setIsSpeedRunOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };
  const reportBuddy = async (buddy: DevBuddy, context = '') => {
    if (!authUser) { setIsAuthModalOpen(true); showToast('Entre com GitHub para denunciar.'); return; }
    const reason = window.prompt(`Descreva o problema${context ? ` em ${context}` : ''} (mínimo de 10 caracteres):`);
    if (reason === null) return;
    const detail = context ? `[Comentário em ${context}] ${reason.trim()}` : reason.trim();
    if (reason.trim().length < 10) { showToast('Descreva o problema em pelo menos 10 caracteres.'); return; }
    const result = await moderationRequest({action:'report',buddyId:buddy.id,reason:detail});
    showToast(result.ok ? 'Denúncia enviada à moderação.' : result.error || 'Não foi possível enviar a denúncia.');
  };
  const loadModeration = async () => {
    const result = await moderationRequest({action:'listReports'});
    if (!result.ok) { showToast(result.error || 'Não foi possível carregar as denúncias.'); return; }
    setReports(result.reports || []); setHiddenCards(result.hidden || []); setIsModerationOpen(true);
  };

  // Initial Cloud Database Fetch
  useEffect(() => {
    let active = true;
    fetchCloudBuddies().then((remoteBuddies) => {
      if (active && remoteBuddies !== null) {
        setBuddies(remoteBuddies);
        setCloudSynced(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Session credentials stay in an HttpOnly cookie; remove credentials from older versions.
  useEffect(() => {
    try {
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USER) || 'null');
      const followed = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWED) || '{}');
      if (Number.isSafeInteger(legacy?.githubId) && Object.values(followed).some(Boolean)) sessionStorage.setItem('fmdb_legacy_progress', JSON.stringify({owner:legacy.githubId, followed}));
    } catch { /* Ignore invalid legacy data. */ }
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.GH_TOKEN);
    if (window.location.hash.startsWith('#gh_token=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let active = true;
    const returned = new URLSearchParams(window.location.search).get('login') === 'ok';
    if (returned) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    getCloudSession().then(user => {
      if (!active || !user) return;
      setAuthUser(user); setGithubToken('session');
      if (returned) {
        showToast(`Conectado como @${user.login}.`);
        if (sessionStorage.getItem('fmdb_return_to_tools') === 'true') { sessionStorage.removeItem('fmdb_return_to_tools'); window.location.hash = 'ferramentas'; }
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUDDIES, JSON.stringify(buddies));
  }, [buddies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OWN_ID, ownBuddyId);
  }, [ownBuddyId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOLLOWED, JSON.stringify(followedMap));
  }, [followedMap]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTO_MARK, String(autoMarkOnClick));
  }, [autoMarkOnClick]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOBILE_DEEPLINK, String(useMobileDeepLink));
  }, [useMobileDeepLink]);

  // Compute totals and per-platform link counts (excluding 'website' from followable score totals)
  const { totalLinks, followedCount, platformCounts } = useMemo(() => {
    let total = 0;
    let followed = 0;
    const counts: Record<string, number> = {};

    for (const b of buddies) {
      for (const p of PLATFORMS) {
        const val = b.socials[p.id];
        if (val && val.trim()) {
          counts[p.id] = (counts[p.id] || 0) + 1;
          if (p.isFollowable !== false) {
            total += 1;
            if (followedMap[`${b.id}:${p.id}`]) {
              followed += 1;
            }
          }
        }
      }
    }

    return { totalLinks: total, followedCount: followed, platformCounts: counts };
  }, [buddies, followedMap]);

  // Load account-specific progress before accepting authenticated changes.
  useEffect(() => {
    if (!authUser) { setProgressReady(false); return; }
    let active = true;
    setProgressReady(false);
    getCloudProgress(authUser.accessToken || githubToken).then(async progress => {
      if (!active) return;
      if (progress === null) { showToast('Não foi possível carregar seu progresso. Entre novamente para tentar.'); return; }
      try {
        const legacy = JSON.parse(sessionStorage.getItem('fmdb_legacy_progress') || 'null');
        if (legacy?.owner === authUser.githubId && legacy.followed && typeof legacy.followed === 'object') {
          const changes = Object.entries(legacy.followed).filter(([,value]) => value === true).flatMap(([key]) => { const i=key.lastIndexOf(':'); const platform=key.slice(i+1) as SocialPlatform; return i>0 && FOLLOWABLE_PLATFORMS.some(p => p.id===platform) ? [{buddyId:key.slice(0,i),platform,followed:true}] : []; });
          if (changes.length && window.confirm('Encontramos progresso antigo neste navegador. Deseja importá-lo para sua conta?')) {
            let ok = true;
            for (let i=0; i<changes.length && ok; i+=50) ok = await updateCloudProgress(authUser.accessToken || githubToken, changes.slice(i,i+50));
            if (ok) { progress = await getCloudProgress(authUser.accessToken || githubToken) || progress; sessionStorage.removeItem('fmdb_legacy_progress'); }
            else showToast('Não foi possível importar todo o progresso. Tente novamente.');
          } else sessionStorage.removeItem('fmdb_legacy_progress');
        }
      } catch { /* Leave legacy data untouched if it cannot be read. */ }
      if (!active) return;
      setFollowedMap(progress);
      setProgressReady(true);
    });
    return () => { active = false; };
  }, [authUser?.githubId, authUser?.accessToken, githubToken]);

  // Filter buddies
  const filteredBuddies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return buddies.filter((buddy) => {
      if (selectedPlatform !== 'all') {
        const val = buddy.socials[selectedPlatform];
        if (!val || !val.trim()) return false;
      }

      const relevantFollowablePlatforms = FOLLOWABLE_PLATFORMS.filter((p) => {
        if (selectedPlatform !== 'all' && selectedPlatform !== 'website' && selectedPlatform !== p.id) {
          return false;
        }
        const val = buddy.socials[p.id];
        return Boolean(val && val.trim());
      });

      if (selectedPlatform !== 'website') {
        if (relevantFollowablePlatforms.length === 0 && !buddy.socials.website?.trim()) {
          return false;
        }

        const followedInRelevant = relevantFollowablePlatforms.filter(
          (p) => followedMap[`${buddy.id}:${p.id}`]
        ).length;

        if (
          statusFilter === 'pending' &&
          (relevantFollowablePlatforms.length === 0 ||
            followedInRelevant === relevantFollowablePlatforms.length)
        ) {
          return false;
        }
        if (statusFilter === 'completed' && followedInRelevant === 0) {
          return false;
        }
      }

      if (q) {
        const haystack = [
          buddy.name,
          buddy.role,
          buddy.companyOrProject || '',
          buddy.bio,
          ...buddy.tags,
          ...Object.values(buddy.socials).filter(Boolean),
        ]
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [buddies, selectedPlatform, statusFilter, searchQuery, followedMap]);

  const applyProgressChanges = async (changes: { buddyId: string; platform: SocialPlatform; followed: boolean }[]) => {
    if (authUser) {
      if (!progressReady || progressBusy.current) { showToast('Aguarde a sincronização do progresso.'); return false; }
      progressBusy.current = true;
      const ok = await updateCloudProgress(authUser.accessToken || githubToken, changes);
      progressBusy.current = false;
      if (!ok) { showToast('Não foi possível salvar seu progresso. Tente novamente.'); return false; }
    }
    setFollowedMap(prev => {
      const next = { ...prev };
      for (const c of changes) { const key = `${c.buddyId}:${c.platform}`; if (c.followed) next[key] = true; else delete next[key]; }
      return next;
    });
    if (authUser) {
      const refreshed = await fetchCloudBuddies();
      if (refreshed) setBuddies(refreshed);
    }
    return true;
  };
  const handleToggleFollow = async (
    buddyId: string,
    platform: SocialPlatform,
    forceState?: boolean
  ) => {
    if (platform === 'website') return false;
    const key = `${buddyId}:${platform}`;
    return applyProgressChanges([{ buddyId, platform, followed: forceState !== undefined ? forceState : !followedMap[key] }]);
  };

  const handleMarkAllForBuddy = async (buddy: DevBuddy, targetState: boolean) => {
    const changes = FOLLOWABLE_PLATFORMS.filter(p => buddy.socials[p.id]?.trim()).map(p => ({buddyId: buddy.id, platform: p.id, followed: targetState}));
    if (!changes.length || !(await applyProgressChanges(changes))) return;
    showToast(
      targetState
        ? `Todas as redes de ${buddy.name} marcadas como seguidas!`
        : `Redes de ${buddy.name} desmarcadas.`
    );
  };

  const handleSuccessGithubAuth = (user: GitHubAuthUser) => {
    setAuthUser(user);
    if (user.accessToken) {
      setGithubToken(user.accessToken);
    }

    const existing = buddies.find(
      (b) =>
        b.ownerGithubId === user.githubId
    );

    if (existing) {
      setOwnBuddyId(existing.id);
      setEditingBuddy(existing);
      setIsAddModalOpen(true);
      showToast(`Bem-vindo de volta, @${user.login}! Seu card foi carregado.`);
    } else {
      setEditingBuddy(null);
      setIsAddModalOpen(true);
      showToast(`Autenticado como @${user.login}! Complete suas outras redes.`);
    }
  };

  const handleLogout = async () => {
    const ok = await endCloudSession();
    if (!ok) { showToast('Não foi possível encerrar a sessão. Tente novamente.'); return; }
    setAuthUser(null);
    setOwnBuddyId('');
    setGithubToken('');
    setFollowedMap({});
    setProgressReady(false);
    showToast('Sessão do GitHub encerrada.');
  };

  const handleSaveBuddy = async (savedBuddy: DevBuddy, isEdit: boolean) => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return false;
    }

    const activeToken = authUser.accessToken || githubToken;
    const buddyWithScore: DevBuddy = {
      ...savedBuddy,
      communityFollowsDone: followedCount,
    };

    const res = await upsertCloudBuddy(buddyWithScore, activeToken);
    if (res.ok && res.buddies) {
      setBuddies(res.buddies);
      setCloudSynced(true);
      showToast(
        isEdit
          ? `Card de @${authUser.login} atualizado no banco!`
          : `Card de @${authUser.login} publicado na Amigos do Mag!`
      );
      return true;
    } else {
      showToast(res.error || 'Não foi possível publicar o cartão.');
      return false;
    }
  };

  const handleOpenEditBuddy = (buddy: DevBuddy) => {
    if (
      !authUser ||
      buddy.ownerGithubId !== authUser.githubId
    ) {
      setIsAuthModalOpen(true);
      return;
    }
    setEditingBuddy(buddy);
    setIsAddModalOpen(true);
  };

  const handleOpenEditOwnProfile = () => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCardsMenuOpen(true);
  };

  const handleGithubApiFollow = async (
    buddyId: string,
    githubUsername: string
  ): Promise<boolean> => {
    const activeToken = authUser?.accessToken || githubToken;
    if (!activeToken.trim()) return false;
    if (!authUser?.canFollow) {
      if (window.confirm('Para seguir perfis pelo portal, o GitHub precisa da sua autorização para seguir usuários. Deseja concedê-la?')) window.location.href = '/api/fmdb/auth?follow=1';
      return false;
    }
    try {
      if (await followCloudGithub(buddyId)) {
        await handleToggleFollow(buddyId, 'github', true);
        showToast(`Você seguiu @${githubUsername} no GitHub com 1-Click!`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleBatchGithubFollow = async (): Promise<{
    followed: number;
    failed: number;
  }> => {
    if (!authUser?.canFollow) {
      if (window.confirm('Para seguir perfis pelo portal, o GitHub precisa da sua autorização para seguir usuários. Deseja concedê-la?')) window.location.href = '/api/fmdb/auth?follow=1';
      return { followed: 0, failed: 0 };
    }
    let followed = 0;
    let failed = 0;

    for (const buddy of buddies) {
      const rawGh = buddy.socials.github;
      if (!rawGh) continue;
      const username = extractCleanHandle('github', rawGh);
      if (!username) continue;

      const ok = await handleGithubApiFollow(buddy.id, username);
      if (ok) followed += 1;
      else failed += 1;
    }

    return { followed, failed };
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        theme === 'dark'
          ? 'bg-[#090B10] text-slate-100 bg-grid-pattern-dark'
          : 'bg-[#F8FAFC] text-slate-900 bg-grid-pattern-light'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-white dark:bg-slate-900/95 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        {/* Header & Hero */}
        <Header
          compact={toolsPage}
          totalBuddies={buddies.length}
          totalLinks={totalLinks}
          followedCount={followedCount}
          hasGithubToken={Boolean((authUser?.accessToken || githubToken).trim())}
          authUser={authUser}
          theme={theme}
          onToggleTheme={() =>
            setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
          }
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenEditOwnProfile={handleOpenEditOwnProfile}
          onLogout={handleLogout}
          onOpenSpeedRun={() => setIsSpeedRunOpen(true)}
          onOpenGithubModal={() => setIsGithubModalOpen(true)}
        />

        <nav aria-label="Navegação do portal" className="sticky top-0 z-30 mx-auto flex max-w-7xl gap-2 bg-white/95 dark:bg-[#090B10]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 sm:static sm:bg-transparent sm:pt-6 sm:pb-0">
          <a href="#inicio" onClick={() => { if (toolsPage) window.scrollTo({ top: 0 }); }} aria-current={!toolsPage ? 'page' : undefined} className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center rounded-xl px-2 sm:px-4 py-2 text-center text-xs sm:text-sm font-bold ${!toolsPage ? 'bg-emerald-500 text-slate-950' : 'border border-slate-400/40'}`}>Comunidade e ranking</a>
          <a href="#ferramentas" onClick={() => { if (!toolsPage) window.scrollTo({ top: 0 }); }} aria-current={toolsPage ? 'page' : undefined} className={`flex min-h-11 flex-1 sm:flex-none items-center justify-center rounded-xl px-2 sm:px-4 py-2 text-center text-xs sm:text-sm font-bold ${toolsPage ? 'bg-emerald-500 text-slate-950' : 'border border-slate-400/40'}`}>Índice de ferramentas</a>
        </nav>
        {toolsPage ? <CommunityTools
          buddies={buddies}
          ownBuddy={authUser ? (buddies.find(b => b.ownerGithubId === authUser.githubId && b.tools) || buddies.find(b => b.ownerGithubId === authUser.githubId)) : undefined}
          authenticated={Boolean(authUser)}
          onReport={(buddy, name) => { void reportBuddy(buddy, name); }}
          onLogin={() => { sessionStorage.setItem('fmdb_return_to_tools', 'true'); setIsAuthModalOpen(true); }}
          onSave={async (tools) => {
            if (!authUser) return false;
            const buddy = buddies.find(b => b.ownerGithubId === authUser.githubId && b.tools) || buddies.find(b => b.ownerGithubId === authUser.githubId);
            if (!buddy) return false;
            const result = await upsertCloudBuddy({ ...buddy, tools }, authUser.accessToken || githubToken);
            if (!result.ok || !result.buddies) return false;
            const saved = result.buddies.find(b => b.id === buddy.id);
            if (!saved?.tools) return false;
            setBuddies(result.buddies);
            return true;
          }}
        /> : <>

        {/* Controls & Filters */}
        <ControlBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          autoMarkOnClick={autoMarkOnClick}
          onToggleAutoMark={() => setAutoMarkOnClick((v) => !v)}
          useMobileDeepLink={useMobileDeepLink}
          onToggleMobileDeepLink={() => setUseMobileDeepLink((v) => !v)}
          platformCounts={platformCounts}
          totalLinks={totalLinks}
          followedCount={followedCount}
        />

        {/* Directory Grid */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {filteredBuddies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBuddies.map((buddy) => {
                const isOwn = Boolean(
                  authUser &&
                    buddy.ownerGithubId === authUser.githubId
                );
                return (
                  <BuddyCard
                    key={buddy.id}
                    buddy={buddy}
                    isOwnCard={isOwn}
                    userFollowedCount={followedCount}
                    totalCommunityLinks={totalLinks}
                    followedMap={followedMap}
                    selectedPlatform={selectedPlatform}
                    autoMarkOnClick={autoMarkOnClick}
                    useMobileDeepLink={useMobileDeepLink}
                    githubToken={authUser?.accessToken || githubToken}
                    onToggleFollow={handleToggleFollow}
                    onMarkAllForBuddy={handleMarkAllForBuddy}
                    onGithubApiFollow={handleGithubApiFollow}
                    onEditBuddy={handleOpenEditBuddy}
                    onReportBuddy={(buddy) => { void reportBuddy(buddy); }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-12 text-center space-y-4 shadow-xs dark:shadow-none">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                <Sparkles className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {buddies.length === 0
                  ? 'Diretório pronto! Seja o primeiro dev da Amigos do Mag a publicar seu card'
                  : 'Nenhum dev encontrado com esses filtros'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {buddies.length === 0
                  ? 'Autentique sua conta do GitHub para inaugurar o hub oficial de conexões da comunidade e cadastrar seu Instagram, TikTok, LinkedIn e GitHub.'
                  : 'Tente limpar a busca ou alternar o filtro de status para "Todos".'}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                {buddies.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedPlatform('all');
                      setStatusFilter('all');
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
                <button
                  onClick={() =>
                    authUser ? handleOpenEditOwnProfile() : setIsAuthModalOpen(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>
                    {authUser ? 'Publicar Meu Card Agora' : 'Autenticar com GitHub'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>
        </>}
      </div>

      {/* Footer honoring Amigos do Mag */}
      <footer className="mt-12 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#07090D] py-8 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5 flex-wrap">
            <FmdbLogo className="h-6 w-6" />
            <span>
              <strong className="text-slate-800 dark:text-slate-300">
                Follow My Dev Buddies
              </strong>{' '}
              • Feito pela e para a comunidade{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                Amigos do Mag
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Cloud className="h-3.5 w-3.5" />
              <span>
                {cloudSynced ? 'Banco Cloud Sincronizado' : 'Cloud Sync Ativo'}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>GitHub Auth Verificado no Servidor</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isCardsMenuOpen && authUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cards-title">
          <div className="max-h-[85dvh] overflow-y-auto w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 id="cards-title" className="text-lg font-bold">Meus cartões</h2><button onClick={() => setIsCardsMenuOpen(false)} aria-label="Fechar">✕</button></div>
            <p className="text-sm text-slate-500">Crie cartões separados para você, seus produtos e empresas.</p>
            {buddies.filter(b => b.ownerGithubId === authUser.githubId).map(b => <div key={b.id} className="flex gap-2"><button onClick={() => { setIsCardsMenuOpen(false); handleOpenEditBuddy(b); }} className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-left text-sm">Editar {b.name}</button><button onClick={async () => { if (!window.confirm(`Excluir o cartão de ${b.name}? As avaliações de ferramentas salvas nele também serão removidas.`)) return; const result = await deleteCloudBuddy(b.id, authUser.accessToken || githubToken); if (result.ok && result.buddies) { setBuddies(result.buddies); showToast('Cartão excluído.'); } else showToast(result.error || 'Não foi possível excluir o cartão.'); }} aria-label={`Excluir cartão de ${b.name}`} className="rounded-xl border border-rose-500/40 px-3 text-sm text-rose-600 dark:text-rose-400">Excluir</button></div>)}
            <button onClick={() => { setIsCardsMenuOpen(false); setEditingBuddy(null); setIsAddModalOpen(true); }} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950">Criar novo cartão</button>
            {authUser.githubId === 94655326 && <button onClick={() => { setIsCardsMenuOpen(false); void loadModeration(); }} className="w-full rounded-xl border border-amber-500/40 px-4 py-3 text-sm font-semibold">Moderação</button>}
            <button onClick={async () => { if (!window.confirm('Excluir sua conta do portal, seus cartões, avaliações e progresso? Esta ação não pode ser desfeita. Cópias automáticas podem manter dados por até 7 dias, e a recuperação do banco por até 30 dias; cópias manuais são geridas pelo administrador. Sua conta do GitHub não será excluída.')) return; const result = await deleteCloudAccount(authUser.accessToken || githubToken); if (!result.ok || !result.buddies) { showToast(result.error || 'Não foi possível excluir sua conta.'); return; } setBuddies(result.buddies); setIsCardsMenuOpen(false); await endCloudSession(); setAuthUser(null); setGithubToken(''); setOwnBuddyId(''); setFollowedMap({}); setProgressReady(false); if (!result.authorizationRevoked) window.alert('Sua conta no portal foi excluída, mas não foi possível revogar a autorização no GitHub. Acesse github.com/settings/applications para remover o acesso do portal.'); else showToast('Conta do portal excluída e autorização do GitHub revogada.'); }} className="w-full rounded-xl border border-rose-500/40 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">Excluir minha conta do portal</button>
          </div>
        </div>
      )}
      {isModerationOpen && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-labelledby="moderation-title"><div className="max-h-[85dvh] overflow-y-auto w-full max-w-2xl rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4"><div className="flex justify-between"><h2 id="moderation-title" className="font-bold text-lg">Moderação</h2><button onClick={() => setIsModerationOpen(false)} aria-label="Fechar moderação">✕</button></div><p className="text-sm text-slate-500">Denúncias são privadas. Ocultar remove o cartão e seus comentários do diretório até a restauração.</p><button onClick={async () => { const r=await moderationRequest({action:"backupNow"}); showToast(r.ok ? "Cópia de segurança criada (retenção de 7 dias)." : r.error || "Não foi possível criar a cópia."); }} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm">Criar cópia de segurança agora</button>{reports.length === 0 && <p className="text-sm">Nenhuma denúncia pendente.</p>}{reports.map(report => { let name = 'Cartão'; let bio = ''; let comments = ''; try { const card = JSON.parse(report.payload) as DevBuddy; name = card.name; bio = card.bio; comments = Object.entries(card.tools?.reviews || {}).filter(([, review]) => review.comment).map(([tool, review]) => `${tool}: ${review.comment}`).join('\n'); } catch {} return <div key={report.id} className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-sm space-y-2"><strong>{name}</strong><p className="whitespace-pre-wrap">{report.reason}</p><p className="text-xs text-slate-500 whitespace-pre-wrap">{bio}</p>{comments && <p className="text-xs whitespace-pre-wrap">{comments}</p>}<div className="flex flex-wrap gap-2"><button onClick={async () => { const r=await moderationRequest({action:'resolveReport',reportId:report.id,decision:'dismiss'}); if (r.ok) await loadModeration(); else showToast(r.error || 'Falha ao atualizar.'); }} className="rounded-lg border px-3 py-2">Dispensar</button><button onClick={async () => { if (!window.confirm(`Ocultar o cartão de ${name} e seus comentários?`)) return; const r=await moderationRequest({action:'resolveReport',reportId:report.id,decision:'hide'}); if (r.ok) { const list=await fetchCloudBuddies(); if (list) setBuddies(list); await loadModeration(); } else showToast(r.error || 'Falha ao atualizar.'); }} className="rounded-lg border border-rose-500/50 px-3 py-2 text-rose-600">Ocultar cartão</button></div></div>; })}{hiddenCards.length > 0 && <h3 className="font-bold">Cartões ocultos</h3>}{hiddenCards.map(item => { let name='Cartão'; try { name=(JSON.parse(item.payload) as DevBuddy).name; } catch {} return <div key={item.card_id} className="flex items-center justify-between gap-2 text-sm"><span>{name}</span><button onClick={async () => { const r=await moderationRequest({action:'restoreCard',buddyId:item.card_id}); if (r.ok) { const list=await fetchCloudBuddies(); if (list) setBuddies(list); await loadModeration(); } else showToast(r.error || 'Falha ao restaurar.'); }} className="rounded-lg border px-3 py-2">Restaurar</button></div>; })}</div></div>}
      <GitHubAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => { setIsAuthModalOpen(false); sessionStorage.removeItem('fmdb_return_to_tools'); }}
        onSuccessAuth={handleSuccessGithubAuth}
      />

      <AddBuddyModal
        isOpen={isAddModalOpen}
        editingBuddy={editingBuddy}
        authUser={authUser}
        additionalCard={Boolean(authUser && buddies.some(b => b.ownerGithubId === authUser.githubId))}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBuddy(null);
        }}
        onSaveBuddy={handleSaveBuddy}
      />

      <SpeedRunModal
        isOpen={isSpeedRunOpen}
        onClose={() => setIsSpeedRunOpen(false)}
        buddies={buddies}
        followedMap={followedMap}
        useMobileDeepLink={useMobileDeepLink}
        onToggleMobileDeepLink={() => setUseMobileDeepLink((v) => !v)}
        onMarkFollowed={(buddyId, platform) =>
          handleToggleFollow(buddyId, platform, true)
        }
      />

      <GitHubConnectModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        githubToken={authUser?.accessToken || githubToken}
        onSaveToken={setGithubToken}
        buddies={buddies}
        onBatchGithubFollow={handleBatchGithubFollow}
      />
    </div>
  );
}

export default App;
