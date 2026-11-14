import React, { useState, useEffect, useMemo } from 'react';
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
  syncCloudFollowScore,
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

  const [authUser, setAuthUser] = useState<GitHubAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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

  const [autoMarkOnClick, setAutoMarkOnClick] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_MARK);
    return saved !== null ? saved === 'true' : true;
  });

  const [useMobileDeepLink, setUseMobileDeepLink] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOBILE_DEEPLINK);
    return saved === 'true';
  });

  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.GH_TOKEN) || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FollowStatusFilter>('all');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCardsMenuOpen, setIsCardsMenuOpen] = useState(false);
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

  // Check if returning from GitHub OAuth Callback (#gh_token=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.startsWith('#gh_token=')) {
      const token = decodeURIComponent(hash.replace('#gh_token=', '').trim());
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (token) {
        fetch('https://api.github.com/user', {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && data.id && data.login) {
              const user: GitHubAuthUser = {
                githubId: data.id,
                login: data.login,
                name: data.name || data.login,
                avatarUrl: data.avatar_url,
                bio: data.bio || '',
                company: data.company ? data.company.replace(/^@/, '') : '',
                blog: data.blog || '',
                twitterUsername: data.twitter_username || '',
                accessToken: token,
              };
              handleSuccessGithubAuth(user);
              if (sessionStorage.getItem('fmdb_return_to_tools') === 'true') {
                sessionStorage.removeItem('fmdb_return_to_tools');
                window.location.hash = 'ferramentas';
              }
            }
          })
          .catch(() => {});
      }
    }
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
    if (authUser) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(authUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  }, [authUser]);

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GH_TOKEN, githubToken);
  }, [githubToken]);

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

  // Sync user's own follow score to cloud DB whenever followedCount changes
  useEffect(() => {
    if (!authUser) return;
    const activeToken = authUser.accessToken || githubToken;
    if (!activeToken) return;

    const myCard = buddies.find(
      (b) =>
        b.ownerGithubId === authUser.githubId
    );
    if (myCard && myCard.communityFollowsDone !== followedCount) {
      setBuddies((prev) =>
        prev.map((b) =>
          b.id === myCard.id ? { ...b, communityFollowsDone: followedCount } : b
        )
      );
      syncCloudFollowScore(myCard.id, followedCount, activeToken);
    }
  }, [followedCount, authUser, githubToken, buddies]);

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

  const handleToggleFollow = (
    buddyId: string,
    platform: SocialPlatform,
    forceState?: boolean
  ) => {
    if (platform === 'website') return;
    const key = `${buddyId}:${platform}`;
    setFollowedMap((prev) => {
      const nextVal = forceState !== undefined ? forceState : !prev[key];
      return { ...prev, [key]: nextVal };
    });
  };

  const handleMarkAllForBuddy = (buddy: DevBuddy, targetState: boolean) => {
    setFollowedMap((prev) => {
      const next = { ...prev };
      for (const p of FOLLOWABLE_PLATFORMS) {
        if (buddy.socials[p.id]?.trim()) {
          next[`${buddy.id}:${p.id}`] = targetState;
        }
      }
      return next;
    });
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

  const handleLogout = () => {
    setAuthUser(null);
    setOwnBuddyId('');
    setGithubToken('');
    showToast('Sessão do GitHub encerrada.');
  };

  const handleSaveBuddy = async (savedBuddy: DevBuddy, isEdit: boolean) => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const activeToken = authUser.accessToken || githubToken;
    const buddyWithScore: DevBuddy = {
      ...savedBuddy,
      communityFollowsDone: followedCount,
    };

    setEditingBuddy(null);

    const res = await upsertCloudBuddy(buddyWithScore, activeToken);
    if (res.ok && res.buddies) {
      setBuddies(res.buddies);
      setCloudSynced(true);
      showToast(
        isEdit
          ? `Card de @${authUser.login} atualizado no banco!`
          : `Card de @${authUser.login} publicado na Amigos do Mag!`
      );
    } else {
      showToast(res.error || 'Não foi possível publicar o cartão.');
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
    try {
      const res = await fetch(
        `https://api.github.com/user/following/${encodeURIComponent(githubUsername)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${activeToken.trim()}`,
            Accept: 'application/vnd.github+json',
            'Content-Length': '0',
          },
        }
      );

      if (res.status === 204 || res.ok) {
        handleToggleFollow(buddyId, 'github', true);
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

        <nav aria-label="Navegação do portal" className="mx-auto flex max-w-7xl gap-2 px-4 sm:px-6 lg:px-8 pt-6">
          <a href="#inicio" aria-current={!toolsPage ? 'page' : undefined} className={`rounded-xl px-4 py-2 text-sm font-bold ${!toolsPage ? 'bg-emerald-500 text-slate-950' : 'border border-slate-400/40'}`}>Comunidade e ranking</a>
          <a href="#ferramentas" aria-current={toolsPage ? 'page' : undefined} className={`rounded-xl px-4 py-2 text-sm font-bold ${toolsPage ? 'bg-emerald-500 text-slate-950' : 'border border-slate-400/40'}`}>Índice de ferramentas</a>
        </nav>
        {toolsPage ? <CommunityTools
          buddies={buddies}
          ownBuddy={authUser ? (buddies.find(b => b.ownerGithubId === authUser.githubId && b.tools) || buddies.find(b => b.ownerGithubId === authUser.githubId)) : undefined}
          authenticated={Boolean(authUser)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="cards-title">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 id="cards-title" className="text-lg font-bold">Meus cartões</h2><button onClick={() => setIsCardsMenuOpen(false)} aria-label="Fechar">✕</button></div>
            <p className="text-sm text-slate-500">Crie cartões separados para você, seus produtos e empresas.</p>
            {buddies.filter(b => b.ownerGithubId === authUser.githubId).map(b => <button key={b.id} onClick={() => { setIsCardsMenuOpen(false); handleOpenEditBuddy(b); }} className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-left text-sm">Editar {b.name}</button>)}
            <button onClick={() => { setIsCardsMenuOpen(false); setEditingBuddy(null); setIsAddModalOpen(true); }} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950">Criar novo cartão</button>
          </div>
        </div>
      )}
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
