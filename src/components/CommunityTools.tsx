import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Save } from 'lucide-react';
import { DevBuddy } from '../types';

const choices = {
  ides: ['VS Code', 'Cursor', 'Windsurf', 'Visual Studio', 'IntelliJ IDEA', 'Neovim', 'Zed'],
  agents: ['Claude Code', 'Codex', 'OpenCode', 'Hermes', 'Rakazo', 'GitHub Copilot', 'Gemini CLI'],
};
type Tools = { ides: string[]; agents: string[] };
const empty: Tools = { ides: [], agents: [] };

export function CommunityTools({ buddies, ownBuddy, authenticated, onLogin, onSave }: {
  buddies: DevBuddy[]; ownBuddy?: DevBuddy; authenticated: boolean;
  onLogin: () => void; onSave: (tools: Tools) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<Tools>(empty);
  const [custom, setCustom] = useState({ ides: '', agents: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setSelected(ownBuddy?.tools || empty); }, [ownBuddy?.id, ownBuddy?.tools]);
  const results = useMemo(() => (Object.keys(choices) as (keyof Tools)[]).map(category => {
    const counts = new Map<string, { name: string; count: number }>();
    let respondents = 0;
    const accounts = new Map<number | string, Set<string>>();
    for (const buddy of buddies) {
      const key = buddy.ownerGithubId ?? buddy.id;
      const values = accounts.get(key) || new Set<string>();
      for (const value of buddy.tools?.[category] || []) values.add(value);
      accounts.set(key, values);
    }
    for (const values of accounts.values()) {
      if (values.size) respondents++;
      for (const value of new Set([...values].map(v => v.trim()).filter(Boolean))) {
        const key = value.toLocaleLowerCase('pt-BR');
        const current = counts.get(key);
        counts.set(key, { name: current?.name || value, count: (current?.count || 0) + 1 });
      }
    }
    return { category, respondents, items: [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) };
  }), [buddies]);
  const toggle = (category: keyof Tools, value: string) => setSelected(prev => ({ ...prev, [category]: prev[category].includes(value) ? prev[category].filter(v => v !== value) : [...prev[category], value] }));
  return <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10" aria-labelledby="tools-title">
    <div className="rounded-3xl border border-emerald-500/25 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
      <div className="flex items-center gap-3"><BarChart3 className="text-emerald-500" /><h2 id="tools-title" className="text-xl font-bold">Ferramentas da comunidade</h2></div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Descubra o que a galera está usando. Cada pessoa pode selecionar várias ferramentas; os percentuais usam quem respondeu em cada categoria.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">{results.map(({ category, respondents, items }) => <div key={category} className="rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-5">
        <h3 className="font-bold">{category === 'ides' ? 'IDEs e editores' : 'Agentes e assistentes'}</h3><p className="text-xs text-slate-500 mt-1">{respondents} {respondents === 1 ? 'pessoa respondeu' : 'pessoas responderam'}</p>
        {items.length ? <ul className="mt-4 space-y-3">{items.map(item => <li key={item.name}><div className="flex justify-between gap-3 text-sm"><span>{item.name}</span><span>{item.count} · {Math.round(item.count / respondents * 100)}%</span></div><div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.count / respondents * 100}%` }} /></div></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">Ainda não há respostas nesta categoria.</p>}
      </div>)}</div>
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6"><h3 className="font-bold">Compartilhe suas ferramentas</h3>
        {!authenticated ? <button onClick={onLogin} className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950">Entrar com GitHub</button> : !ownBuddy ? <p className="mt-2 text-sm text-slate-500">Publique seu perfil para participar do índice.</p> : <>
          {(Object.keys(choices) as (keyof Tools)[]).map(category => <fieldset key={category} className="mt-5"><legend className="text-sm font-semibold">{category === 'ides' ? 'IDEs e editores' : 'Agentes e assistentes'}</legend><div className="mt-2 flex flex-wrap gap-2">{[...new Set([...choices[category], ...selected[category]])].map(value => <button type="button" key={value} aria-pressed={selected[category].includes(value)} onClick={() => toggle(category, value)} className={`rounded-full border px-3 py-1.5 text-xs ${selected[category].includes(value) ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'border-slate-300 dark:border-slate-700'}`}>{value}</button>)}</div><div className="mt-3 flex gap-2"><input aria-label={`Outra ferramenta: ${category}`} value={custom[category]} onChange={e => setCustom({ ...custom, [category]: e.target.value })} placeholder="Outra ferramenta" maxLength={40} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /><button type="button" onClick={() => { const value = custom[category].trim(); if (value && !selected[category].some(v => v.toLowerCase() === value.toLowerCase())) setSelected(prev => ({ ...prev, [category]: [...prev[category], value] })); setCustom({ ...custom, [category]: '' }); }} className="text-sm text-emerald-600 dark:text-emerald-400">Adicionar</button></div></fieldset>)}
          <button disabled={saving} onClick={async () => { setSaving(true); const ok = await onSave(selected); setMessage(ok ? 'Suas ferramentas foram salvas.' : 'Não foi possível salvar. Tente novamente.'); setSaving(false); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar minhas ferramentas'}</button><p role="status" className="mt-2 text-sm">{message}</p>
        </>}
      </div>
    </div>
  </section>;
}
