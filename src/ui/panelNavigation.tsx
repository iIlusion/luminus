import * as React from "react";
import { Hammer, PanelsTopLeft, ScrollText, Search, Wrench } from "lucide-react";

export type PanelCategory = {
  id: string;
  label: string;
  summary: string;
  target: string;
  focus?: string;
  tone?: string;
  icon: React.ReactNode;
};

export type PanelSearchEntry = {
  id: string;
  title: string;
  summary: string;
  category: string;
  target: string;
  focus?: string;
  keywords?: string[];
  action?: () => void;
};

export function normalizePanelSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function searchPanelEntries(entries: PanelSearchEntry[], query: string): PanelSearchEntry[] {
  const needle = normalizePanelSearch(query);
  if (!needle) return [];
  return entries
    .map(entry => {
      const title = normalizePanelSearch(entry.title);
      const category = normalizePanelSearch(entry.category);
      const keywords = (entry.keywords ?? []).map(normalizePanelSearch);
      let score = 0;
      if (title === needle) score = 100;
      else if (title.startsWith(needle)) score = 80;
      else if (title.includes(needle)) score = 60;
      else if (keywords.some(word => word.startsWith(needle))) score = 40;
      else if (category.includes(needle)) score = 30;
      else if (normalizePanelSearch(entry.summary).includes(needle)) score = 20;
      return { entry, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "pt-BR"))
    .map(result => result.entry);
}

export const CORE_PANEL_CATEGORIES: PanelCategory[] = [
  { id: "utilities", label: "Utilidades", summary: "Avatar, interação e ferramentas", target: "utilities", tone: "player", icon: <Wrench aria-hidden="true" /> },
  { id: "interface", label: "Interface", summary: "Tema, rádio e guarda-roupa", target: "interface", tone: "visual", icon: <PanelsTopLeft aria-hidden="true" /> },
  { id: "records", label: "Registro", summary: "Logs, conversas e links salvos", target: "records", tone: "logs", icon: <ScrollText aria-hidden="true" /> },
  { id: "construction", label: "Construção", summary: "Opções de renderização", target: "construction", tone: "render", icon: <Hammer aria-hidden="true" /> },
];

type PanelLauncherProps = {
  categories: PanelCategory[];
  entries: PanelSearchEntry[];
  onNavigate: (target: string, focus?: string) => void;
  onOpenEntry?: (entry: PanelSearchEntry) => void;
  status?: React.ReactNode;
};

export function PanelLauncher({ categories, entries, onNavigate, onOpenEntry, status }: PanelLauncherProps) {
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const results = React.useMemo(() => searchPanelEntries(entries, query), [entries, query]);

  React.useEffect(() => setActiveIndex(0), [query]);

  function choose(entry: PanelSearchEntry) {
    setQuery("");
    if (onOpenEntry) onOpenEntry(entry);
    else if (entry.action) entry.action();
    else onNavigate(entry.target, entry.focus);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setQuery(""); return; }
    if (!results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => (index + 1) % results.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => (index - 1 + results.length) % results.length); }
    if (event.key === "Enter") { event.preventDefault(); choose(results[activeIndex]); }
  }

  return (
    <div className="lm-launcher" onClick={event => event.stopPropagation()}>
      {status}
      <div className="lm-panel-search">
        <Search size={15} aria-hidden="true" />
        <input
          className="lm-input"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Pesquisar função"
          aria-label="Pesquisar função"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="lm-panel-search-results"
        />
      </div>
      {results.length > 0 ? (
        <div id="lm-panel-search-results" className="lm-search-results" role="listbox">
          {results.map((entry, index) => (
            <button
              type="button"
              key={entry.id}
              className={`lm-search-result${index === activeIndex ? " is-active" : ""}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(entry)}
            >
              <span className="lm-search-result-title">{entry.title}</span>
              <span className="lm-search-result-meta">{entry.category} · {entry.summary}</span>
            </button>
          ))}
        </div>
      ) : query ? (
        <div className="lm-search-empty">Nenhuma função encontrada.</div>
      ) : null}
      {!query && (
        <div className="lm-launcher-grid">
          {categories.map(category => (
            <button
              type="button"
              key={category.id}
              className={`lm-launcher-item${category.tone ? ` is-${category.tone}` : ""}`}
              onClick={() => onNavigate(category.target, category.focus)}
              title={category.summary}
            >
              <span className="lm-launcher-icon">{category.icon}</span>
              <span>{category.label}</span>
              <small>{category.summary}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function panelSearchEntries(categories: PanelCategory[], extra: PanelSearchEntry[] = []): PanelSearchEntry[] {
  return [
    ...categories.map(category => ({
      id: `category:${category.id}`,
      title: category.label,
      summary: category.summary,
      category: "Categoria",
      target: category.target,
      focus: category.focus,
      keywords: [category.id],
    })),
    ...extra,
  ];
}
