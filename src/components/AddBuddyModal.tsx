import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserPlus,
  UserPen,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Dices,
  ShieldCheck,
  Palette,
  Lock,
} from 'lucide-react';
import { DevBuddy, SocialLinks } from '../types';
import {
  PLATFORMS,
  extractCleanHandle,
  validateSafeWebsiteUrl,
  buildSocialUrl,
} from '../utils/socialLinks';
import {
  AVATAR_STYLES,
  AVATAR_BG_COLORS,
  PRESET_SEEDS,
  buildDiceBearUrl,
  processUploadedAvatar,
} from '../utils/avatarBank';
import { GitHubAuthUser } from './GitHubAuthModal';
import { SocialIcon } from './SocialIcon';
import { ProfileLookup } from './ProfileLookup';

interface AddBuddyModalProps {
  isOpen: boolean;
  editingBuddy: DevBuddy | null;
  authUser: GitHubAuthUser | null;
  additionalCard?: boolean;
  onClose: () => void;
  onSaveBuddy: (buddy: DevBuddy, isEdit: boolean) => void;
}

export const AddBuddyModal: React.FC<AddBuddyModalProps> = ({
  isOpen,
  editingBuddy,
  authUser,
  additionalCard = false,
  onClose,
  onSaveBuddy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [githubLookup, setGithubLookup] = useState('');
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [githubMessage, setGithubMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [companyOrProject, setCompanyOrProject] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('React, TypeScript, AI');
  const [socials, setSocials] = useState<SocialLinks>({
    instagram: '',
    tiktok: '',
    github: '',
    linkedin: '',
    twitter: '',
    youtube: '',
    bluesky: '',
    website: '',
  });

  // Avatar Bank State
  const [avatarTab, setAvatarTab] = useState<'bank' | 'upload' | 'github'>('bank');
  const [selectedStyle, setSelectedStyle] = useState('notionists');
  const [selectedBgColor, setSelectedBgColor] = useState('059669');
  const [seedOffset, setSeedOffset] = useState(0);

  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setGithubMessage(null);

    if (editingBuddy) {
      setName(editingBuddy.name);
      setRole(editingBuddy.role);
      setCompanyOrProject(editingBuddy.companyOrProject || '');
      setBio(editingBuddy.bio);
      setAvatarUrl(editingBuddy.avatarUrl);
      setTagsInput(editingBuddy.tags.join(', '));
      setSocials({
        ...editingBuddy.socials,
        instagram: editingBuddy.socials.instagram || '',
        tiktok: editingBuddy.socials.tiktok || '',
        github: editingBuddy.socials.github || '',
        linkedin: editingBuddy.socials.linkedin || '',
        twitter: editingBuddy.socials.twitter || '',
        youtube: editingBuddy.socials.youtube || '',
        bluesky: editingBuddy.socials.bluesky || '',
        website: editingBuddy.socials.website || '',
      });
      setGithubLookup(editingBuddy.socials.github || authUser?.login || '');
    } else if (authUser && !additionalCard) {
      // Pre-populate from authenticated GitHub user
      setName(authUser.name);
      setRole('Software Developer');
      setCompanyOrProject(authUser.company || 'Amigos do Mag');
      setBio(authUser.bio || '');
      setAvatarUrl(authUser.avatarUrl);
      setTagsInput('TypeScript, React, AI');
      setSocials({
        instagram: '',
        tiktok: '',
        github: authUser.login,
        linkedin: '',
        twitter: authUser.twitterUsername || '',
        youtube: '',
        bluesky: '',
        website: authUser.blog || '',
      });
      setGithubLookup(authUser.login);
    } else {
      setName('');
      setRole('');
      setCompanyOrProject('');
      setBio('');
      const defaultAvatar = buildDiceBearUrl('notionists', 'DevAlpha', '059669');
      setAvatarUrl(defaultAvatar);
      setTagsInput('React, TypeScript, AI');
      setSocials({
        instagram: '',
        tiktok: '',
        github: '',
        linkedin: '',
        twitter: '',
        youtube: '',
        bluesky: '',
        website: '',
      });
      setGithubLookup('');
    }
  }, [isOpen, editingBuddy, authUser, additionalCard]);

  if (!isOpen) return null;

  const handleImportFromGithub = async () => {
    const cleanUser = extractCleanHandle('github', githubLookup);
    if (!cleanUser) {
      setGithubMessage({
        type: 'error',
        text: 'Digite um username válido do GitHub.',
      });
      return;
    }

    setLoadingGithub(true);
    setGithubMessage(null);
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
      if (!res.ok) {
        throw new Error('Usuário não encontrado no GitHub');
      }
      const data = await res.json();
      if (data.name && !name) setName(data.name);
      else if (!name) setName(data.login);

      if (data.bio && !bio) setBio(data.bio);
      if (data.company && !companyOrProject) {
        setCompanyOrProject(data.company.replace(/^@/, ''));
      }
      if (data.avatar_url) setAvatarUrl(data.avatar_url);
      if (!role) setRole('Software Developer');

      setSocials((prev) => ({
        ...prev,
        github: data.login || cleanUser,
        twitter: data.twitter_username || prev.twitter,
        website: data.blog || prev.website,
      }));

      setGithubMessage({
        type: 'success',
        text: `Foto e dados de @${data.login} importados do GitHub com sucesso!`,
      });
    } catch {
      setGithubMessage({
        type: 'error',
        text: 'Não foi possível buscar esse usuário na API do GitHub.',
      });
    } finally {
      setLoadingGithub(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedAvatar(file);
      setAvatarUrl(dataUrl);
      setFormError('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao carregar foto de perfil.'
      );
    }
  };

  const handleSocialChange = (key: keyof SocialLinks, value: string) => {
    setSocials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Por favor, informe seu nome ou apelido na comunidade.');
      return;
    }

    if (socials.website && socials.website.trim()) {
      const webCheck = validateSafeWebsiteUrl(socials.website);
      if (!webCheck.valid) {
        setFormError(webCheck.error || 'URL de site inválida.');
        return;
      }
    }

    const cleanedSocials: SocialLinks = {};
    let hasAtLeastOneSocial = false;

    for (const p of PLATFORMS) {
      const raw = socials[p.id];
      if (raw && raw.trim()) {
        if (p.id === 'website') {
          const webCheck = validateSafeWebsiteUrl(raw);
          if (webCheck.valid && webCheck.safeUrl) {
            cleanedSocials.website = webCheck.safeUrl;
            hasAtLeastOneSocial = true;
          }
        } else {
          const handle = extractCleanHandle(p.id, raw);
          if (handle) {
            cleanedSocials[p.id] = handle;
            hasAtLeastOneSocial = true;
          }
        }
      }
    }

    if (!hasAtLeastOneSocial) {
      setFormError(
        'Adicione pelo menos 1 rede social válida (ex: Instagram, TikTok, GitHub ou LinkedIn).'
      );
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    const savedBuddy: DevBuddy = {
      id: editingBuddy
        ? editingBuddy.id
        : `new:${crypto.randomUUID()}`,
      name: name.trim(),
      role: role.trim() || 'Developer',
      companyOrProject: companyOrProject.trim() || 'Amigos do Mag',
      bio:
        bio.trim() ||
        'Membro da comunidade Amigos do Mag. Vamos nos conectar nas redes!',
      avatarUrl:
        avatarUrl.trim() ||
        buildDiceBearUrl(selectedStyle, name.trim(), selectedBgColor),
      tags: parsedTags.length > 0 ? parsedTags : ['Dev', 'AmigosDoMag'],
      socials: cleanedSocials,
      isOwnerCard: true,
      communityFollowsDone: editingBuddy?.communityFollowsDone || 0,
      joinedAt: editingBuddy?.joinedAt || new Date().toISOString().slice(0, 10),
      tools: editingBuddy?.tools,
    };

    onSaveBuddy(savedBuddy, Boolean(editingBuddy));
    onClose();
  };

  const gallerySeeds = PRESET_SEEDS.map((s, idx) => `${s}-${seedOffset + idx}`);

  return (
    <div role="dialog" aria-modal="true" aria-label={editingBuddy ? 'Editar cartão' : 'Criar cartão'} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D111A] p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              {editingBuddy ? (
                <UserPen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {editingBuddy
                    ? `Editar Card de ${editingBuddy.name}`
                    : 'Completar Meu Card • Amigos do Mag'}
                </h2>
                {authUser && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />@{authUser.login}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use sua foto do GitHub, escolha um avatar da coleção DiceBear ou envie uma foto
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {formError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-300 font-medium">
              {formError}
            </div>
          )}

          {/* Avatar Studio (Banco de Avatares + Upload + GitHub) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    avatarUrl ||
                    buildDiceBearUrl(selectedStyle, name || 'DevAlpha', selectedBgColor)
                  }
                  alt="Preview do Avatar"
                  className="h-16 w-16 rounded-2xl border-2 border-emerald-500/50 bg-slate-200 dark:bg-slate-800 object-cover shadow-md shrink-0"
                />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Seu Avatar no Portal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Coleção oficial <strong className="text-emerald-600 dark:text-emerald-400">DiceBear</strong>, Upload ou Foto do GitHub
                  </p>
                </div>
              </div>

              {/* Avatar Source Tabs */}
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAvatarTab('bank')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    avatarTab === 'bank'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Banco de Avatares</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    avatarTab === 'upload'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarTab('github');
                    if (authUser?.avatarUrl) {
                      setAvatarUrl(authUser.avatarUrl);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    avatarTab === 'github'
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <SocialIcon platform="github" className="h-3.5 w-3.5" />
                  <span>Foto do GitHub</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Avatar Bank (DiceBear) */}
            {avatarTab === 'bank' && (
              <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {AVATAR_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(st.id);
                          setAvatarUrl(
                            buildDiceBearUrl(st.id, gallerySeeds[0], selectedBgColor)
                          );
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                          selectedStyle === st.id
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSeedOffset((prev) => prev + 12)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 cursor-pointer"
                  >
                    <Dices className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Sortear Novos</span>
                  </button>
                </div>

                {/* Background Color swatches */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cor de fundo:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVATAR_BG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setSelectedBgColor(c.hex);
                          setAvatarUrl(
                            buildDiceBearUrl(selectedStyle, gallerySeeds[0], c.hex)
                          );
                        }}
                        className={`h-5 w-5 rounded-full border-2 transition-transform cursor-pointer ${
                          selectedBgColor === c.hex
                            ? 'scale-125 border-white ring-2 ring-emerald-500'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: `#${c.hex}` }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Grid of 12 selectable avatars */}
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-1">
                  {gallerySeeds.map((seed) => {
                    const url = buildDiceBearUrl(
                      selectedStyle,
                      seed,
                      selectedBgColor
                    );
                    const isSelected = avatarUrl === url;
                    return (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`group relative aspect-square rounded-xl border overflow-hidden transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500 scale-105'
                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400/60'
                        }`}
                      >
                        <img
                          src={url}
                          alt={seed}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Photo Upload */}
            {avatarTab === 'upload' && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Envie uma imagem PNG, JPG ou WebP do seu computador ou celular. Ela será recortada automaticamente em formato quadrado (240x240px).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 shrink-0 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Escolher Foto do Dispositivo</span>
                </button>
              </div>
            )}

            {/* Tab 3: GitHub Auto-Import */}
            {avatarTab === 'github' && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>Importar Foto + Dados do GitHub:</span>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={githubLookup}
                      onChange={(e) => setGithubLookup(e.target.value)}
                      placeholder="Digite seu username do GitHub (ex: torvalds)"
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleImportFromGithub}
                      disabled={loadingGithub}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {loadingGithub ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <SocialIcon platform="github" className="h-3.5 w-3.5" />
                      )}
                      <span>Puxar do GitHub</span>
                    </button>
                  </div>
                </div>

                {githubMessage && (
                  <div
                    className={`flex items-center gap-1.5 text-xs ${
                      githubMessage.type === 'success'
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {githubMessage.type === 'success' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{githubMessage.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Seu Nome / Apelido *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Danilo"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Especialidade
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Fullstack Dev, Mobile, IA..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Empresa ou Projeto Atual
              </label>
              <input
                type="text"
                value={companyOrProject}
                onChange={(e) => setCompanyOrProject(e.target.value)}
                placeholder="Ex: Pastu, Freelancer, Amigos do Mag"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tags / Stack (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="React, Node.js, SaaS, VibeCoding"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mini Bio / Sobre você
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Uma frase rápida sobre o que você está construindo ou compartilhando nas redes..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Social Networks Grid */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Suas Redes Sociais (Cole a URL ou apenas o @usuario)
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Redes usam domínios oficiais. Sites pessoais são links externos.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => {
                const rawVal = socials[platform.id] || '';
                const hasVal = Boolean(rawVal.trim());
                const isLockedGithub = false;

                let previewUrl = '';
                let invalidMsg = '';

                if (hasVal) {
                  if (platform.id === 'website') {
                    const check = validateSafeWebsiteUrl(rawVal);
                    if (check.valid) previewUrl = check.safeUrl;
                    else invalidMsg = check.error || 'URL inválida';
                  } else {
                    const clean = extractCleanHandle(platform.id, rawVal);
                    if (clean) previewUrl = buildSocialUrl(platform.id, clean, false);
                    else invalidMsg = 'Usuário inválido';
                  }
                }

                return (
                  <div key={platform.id}>
                    <label className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <SocialIcon
                          platform={platform.id}
                          className={`h-3.5 w-3.5 ${platform.colorClass}`}
                        />
                        <span>{platform.label}</span>
                      </span>
                      {isLockedGithub && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          <Lock className="h-2.5 w-2.5" />
                          Autenticado
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={rawVal}
                      readOnly={isLockedGithub}
                      onChange={(e) => handleSocialChange(platform.id, e.target.value)}
                      placeholder={platform.placeholder}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none ${
                        isLockedGithub
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500'
                      }`}
                    />
                    {hasVal && (
                      <p
                        className={`mt-1 truncate font-mono text-[10px] ${
                          invalidMsg
                            ? 'text-rose-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {invalidMsg ? `⚠️ ${invalidMsg}` : `✓ Vai abrir: ${previewUrl}`}
                      </p>
                    )}
                    {(platform.id === 'github' || platform.id === 'bluesky') && <ProfileLookup platform={platform.id} value={rawVal} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 cursor-pointer"
            >
              {editingBuddy ? (
                <>
                  <UserPen className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Publicar Meu Card</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
