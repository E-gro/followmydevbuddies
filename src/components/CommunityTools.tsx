import { useEffect, useMemo, useState } from 'react';
import { BarChart3, MessageSquare, Save, Search } from 'lucide-react';
import { CommunityToolData, DevBuddy, ToolCategory, ToolReview } from '../types';

const categories: { id: ToolCategory; label: string; options: string[] }[] = [
  { id: 'ides', label: 'IDEs e editores', options: ['VS Code', 'Visual Studio', 'Cursor', 'Windsurf', 'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'Android Studio', 'Neovim', 'Zed', 'Sublime Text', 'Emacs', 'Google Antigravity', 'Trae'] },
  { id: 'agents', label: 'Agentes e assistentes', options: ['Claude Code', 'GitHub Copilot', 'Codex', 'Cursor', 'OpenCode', 'Gemini CLI', 'GitHub Copilot CLI', 'Google Antigravity', 'Amazon Q Developer', 'Cline', 'Roo Code', 'Aider', 'Continue', 'Amp', 'Pi', 'Hermes', 'Rakazo'] },
  { id: 'automation', label: 'Automação e agentes', options: ['n8n', 'Make', 'Zapier', 'Dify', 'Flowise', 'LangChain', 'LangGraph', 'CrewAI', 'Microsoft Power Automate', 'OpenClaw'] },
  { id: 'design', label: 'Design e criação', options: ['Figma', 'Canva', 'Adobe Photoshop', 'Adobe Illustrator', 'Framer', 'Penpot', 'Blender'] },
  { id: 'cloud', label: 'Hospedagem e infraestrutura', options: ['Cloudflare', 'Vercel', 'AWS', 'Google Cloud', 'Microsoft Azure', 'Supabase', 'Firebase', 'Netlify', 'Railway', 'Docker'] },
];
const reviewKey = (category: ToolCategory, name: string) => `${category}:${name.trim().toLocaleLowerCase('pt-BR')}`;
const statuses = { good: 'Funciona bem', mixed: 'Mais ou menos', bad: 'Não funciona bem' } as const;

export function CommunityTools({ buddies, ownBuddy, authenticated, onLogin, onSave }: {
  buddies: DevBuddy[]; ownBuddy?: DevBuddy; authenticated: boolean;
  onLogin: () => void; onSave: (tools: CommunityToolData) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<CommunityToolData>({});
  const [category, setCategory] = useState<ToolCategory>('ides');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setSelected(ownBuddy?.tools || {}); }, [ownBuddy?.id, ownBuddy?.tools]);
  const accounts = useMemo(() => {
    const unique = new Map<number | string, DevBuddy>();
    for (const buddy of buddies) {
      const id = buddy.ownerGithubId ?? buddy.id;
      if (!unique.has(id) || (buddy.tools && !unique.get(id)?.tools)) unique.set(id, buddy);
    }
    return [...unique.values()].filter(b => b.tools);
  }, [buddies]);
  const current = categories.find(c => c.id === category)!;
  const selectedNames = selected[category] || [];
  const tools = useMemo(() => {
    const names = new Map<string, string>();
    for (const name of [...current.options, ...accounts.flatMap(b => b.tools?.[category] || []), ...selectedNames]) {
      const normalized = name.trim().toLocaleLowerCase('pt-BR');
      if (normalized && !names.has(normalized)) names.set(normalized, name.trim());
    }
    return [...names.values()].map(name => {
      const users = accounts.filter(b => (b.tools?.[category] || []).some(v => v.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')));
      const reviews = users.map(b => ({ buddy: b, review: b.tools?.reviews?.[reviewKey(category, name)] })).filter((v): v is { buddy: DevBuddy; review: ToolReview } => Boolean(v.review));
      return { name, count: users.length, reviews };
    }).filter(item => item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [accounts, category, current, search, selectedNames]);
  const toggle = (name: string) => setSelected(prev => {
    const values = prev[category] || [];
    return { ...prev, [category]: values.some(v => v.toLowerCase() === name.toLowerCase()) ? values.filter(v => v.toLowerCase() !== name.toLowerCase()) : [...values, name] };
  });
  const setReview = (name: string, patch: Partial<ToolReview>) => setSelected(prev => {
    const key = reviewKey(category, name);
    return { ...prev, reviews: { ...prev.reviews, [key]: { status: '', comment: '', ...prev.reviews?.[key], ...patch } } };
  });
  return <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8" aria-labelledby="tools-title">
    <div className="rounded-3xl border border-emerald-500/25 bg-white dark:bg-slate-900/70 p-5 sm:p-8">
      <div className="flex items-center gap-3"><BarChart3 className="text-emerald-500" /><h2 id="tools-title" className="text-2xl font-bold">Ferramentas da comunidade</h2></div>
      <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Veja o que a comunidade usa e como está funcionando. Selecione suas ferramentas e compartilhe sua experiência; seus comentários ficam públicos.</p>
      <p className="mt-3 text-xs text-slate-500">Catálogo inicial inspirado nas pesquisas <a className="text-emerald-600 underline" href="https://survey.stackoverflow.co/2026/technology/data" target="_blank" rel="noreferrer">Stack Overflow 2026</a> e <a className="text-emerald-600 underline" href="https://blog.jetbrains.com/research/2026/08/ai-coding-agent-adoption-2026/" target="_blank" rel="noreferrer">JetBrains</a>. A ordem abaixo reflete somente respostas da comunidade.</p>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Categorias de ferramentas">{categories.map(c => <button key={c.id} onClick={() => { setCategory(c.id); setSearch(''); }} aria-pressed={category === c.id} className={`rounded-full border px-4 py-2 text-sm font-semibold ${category === c.id ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 dark:border-slate-700'}`}>{c.label}</button>)}</div>
      <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ferramenta nesta categoria" aria-label="Buscar ferramenta" className="w-full bg-transparent text-sm outline-none" /></label>
      <p className="mt-4 text-xs text-slate-500">{accounts.filter(b => (b.tools?.[category] || []).length > 0).length} pessoas responderam nesta categoria. Cada pessoa pode marcar mais de uma ferramenta.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{tools.map(({ name, count, reviews }) => {
        const checked = selectedNames.some(v => v.toLowerCase() === name.toLowerCase());
        const review = selected.reviews?.[reviewKey(category, name)];
        return <article key={name} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{name}</h3><p className="mt-1 text-xs text-slate-500">{count} {count === 1 ? 'pessoa usa' : 'pessoas usam'} · {reviews.filter(r => r.review.status === 'good').length} dizem que funciona bem</p></div>{authenticated && ownBuddy && <button type="button" aria-pressed={checked} onClick={() => toggle(name)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${checked ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 dark:border-slate-700'}`}>{checked ? 'Uso ✓' : 'Eu uso'}</button>}</div>
          {checked && <div className="mt-4 space-y-2"><label className="block text-xs font-semibold">Como funciona para você?<select value={review?.status || ''} onChange={e => setReview(name, { status: e.target.value as ToolReview['status'] })} className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"><option value="">Ainda não avaliei</option><option value="good">Funciona bem</option><option value="mixed">Mais ou menos</option><option value="bad">Não funciona bem</option></select></label><label className="block text-xs font-semibold">Comentário público (opcional)<textarea value={review?.comment || ''} onChange={e => setReview(name, { comment: e.target.value })} maxLength={400} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm" placeholder="Conte sua experiência" /></label></div>}
          {reviews.filter(r => r.review.status || r.review.comment).length > 0 && <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">{reviews.filter(r => r.review.status || r.review.comment).map(({ buddy, review: r }) => <div key={buddy.ownerGithubId ?? buddy.id} className="text-xs text-slate-600 dark:text-slate-300"><span className="font-semibold">{buddy.name}</span>{r.status && <> · {statuses[r.status]}</>}{r.comment && <p className="mt-1 flex gap-1.5 whitespace-pre-wrap"><MessageSquare className="h-3.5 w-3.5 shrink-0" />{r.comment}</p>}</div>)}</div>}
        </article>;
      })}</div>
      {tools.length === 0 && <p className="py-5 text-sm text-slate-500">Nenhuma ferramenta encontrada nesta categoria.</p>}
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5">{!authenticated ? <button onClick={onLogin} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950">Entrar com GitHub para participar</button> : !ownBuddy ? <p className="text-sm text-slate-500">Publique um cartão para participar do índice.</p> : <><div className="flex flex-wrap gap-2"><input value={custom} onChange={e => setCustom(e.target.value)} maxLength={40} placeholder="Outra ferramenta nesta categoria" aria-label="Outra ferramenta" className="min-w-56 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /><button onClick={() => { const value = custom.trim(); if (value && !selectedNames.some(v => v.toLowerCase() === value.toLowerCase())) setSelected(prev => ({ ...prev, [category]: [...(prev[category] || []), value] })); setCustom(''); }} className="text-sm font-semibold text-emerald-600">Adicionar</button></div><button disabled={saving} onClick={async () => { setSaving(true); const ok = await onSave(selected); setMessage(ok ? 'Suas respostas foram salvas.' : 'Não foi possível salvar. Tente novamente.'); setSaving(false); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar minhas respostas'}</button><p role="status" className="mt-2 text-sm">{message}</p></>}</div>
    </div>
  </main>;
}
