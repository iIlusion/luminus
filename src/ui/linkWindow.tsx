import * as React from "react";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
import {
  getAllLinks, onLinksChange, recordLink, fmtLastClicked,
  isFavorite, toggleFavorite, removePerson, removeLink, clearAllLinks,
  isLinkBlocked, toggleLinkBlocked, getGenderFor, type LinkRecord,
} from "../links/linkStore";
import { toUrl } from "../links/linkDomains";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

/** Normalize link for duplicate detection across accounts. */
function linkKey(link: string): string {
  return link.trim().toLowerCase().replace(/\/+$/, "");
}

type LinkFilter = "all" | "multi" | "dup" | "blocked" | "favorites" | "unopened";

const LINK_FILTERS: { id: LinkFilter; label: string; title: string }[] = [
  { id: "all", label: "Todos", title: "Mostrar todas as pessoas" },
  { id: "multi", label: "Vários links", title: "Pessoas com mais de um link" },
  { id: "dup", label: "Link duplicado", title: "Mesmo link em duas ou mais contas" },
  { id: "blocked", label: "Bloqueados", title: "Pessoas com algum link bloqueado no ícone" },
  { id: "favorites", label: "Favoritos", title: "Somente favoritos" },
  { id: "unopened", label: "Não abertos", title: "Ainda não clicou em nenhum link dessa pessoa" },
];

/** linkKey → list of person names that share it (only keys with 2+ names). */
function buildSharedLinkIndex(all: Array<[string, LinkRecord[]]>): Map<string, string[]> {
  const byLink = new Map<string, string[]>();
  for (const [name, links] of all) {
    const seen = new Set<string>();
    for (const rec of links) {
      const key = linkKey(rec.link);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const list = byLink.get(key) ?? [];
      list.push(name);
      byLink.set(key, list);
    }
  }
  const shared = new Map<string, string[]>();
  for (const [key, names] of byLink) {
    if (names.length >= 2) shared.set(key, names);
  }
  return shared;
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#ffc94d" : "none"} stroke={filled ? "#ffc94d" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5Z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
);

const ClickIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 2l6 16 2-6 6-2z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
  </svg>
);

export function LinkWindow({ api, open, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ x: 0, y: 0 });
  const startSize = React.useRef({ w: 0, h: 0, x: 0, y: 0 });

  const [, setTick] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("");
  const [linkFilter, setLinkFilter] = React.useState<LinkFilter>("all");
  React.useEffect(() => onLinksChange(() => setTick(t => t + 1)), []);

  if (!open) return null;

  const all = Object.entries(getAllLinks());
  const sharedByLink = buildSharedLinkIndex(all);
  const peopleWithSharedLink = new Set<string>();
  for (const names of sharedByLink.values()) {
    for (const n of names) peopleWithSharedLink.add(n);
  }

  const query = search.trim().toLowerCase();
  const filtered = all.filter(([name, links]) => {
    const matchesSearch = !query
      || name.toLowerCase().includes(query)
      || links.some(record => record.link.toLowerCase().includes(query));

    const gender = getGenderFor(name);
    const matchesGender = !genderFilter
      || (genderFilter === "unknown" ? !gender : gender === genderFilter);

    let matchesLink = true;
    if (linkFilter === "multi") matchesLink = links.length >= 2;
    else if (linkFilter === "dup") matchesLink = peopleWithSharedLink.has(name);
    else if (linkFilter === "blocked") matchesLink = links.some(r => r.blocked === true);
    else if (linkFilter === "favorites") matchesLink = isFavorite(name);
    else if (linkFilter === "unopened") matchesLink = links.every(r => (r.clicks ?? 0) === 0);

    return matchesSearch && matchesGender && matchesLink;
  });

  // favorites first, then alphabetical within each group — keeps a growing list scannable.
  const entries = [...filtered].sort(([a], [b]) => {
    const fa = isFavorite(a), fb = isFavorite(b);
    if (fa !== fb) return fa ? -1 : 1;
    return a.localeCompare(b);
  });

  function sharedWith(name: string, link: string): string[] {
    const others = sharedByLink.get(linkKey(link));
    if (!others) return [];
    return others.filter(n => n !== name);
  }

  function onDragMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const rect = ref.current!.getBoundingClientRect();
    drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const move = (ev: MouseEvent) => {
      const p = ref.current!;
      p.style.left   = `${ev.clientX - drag.current.x}px`;
      p.style.top    = `${ev.clientY - drag.current.y}px`;
      p.style.right  = "auto";
      p.style.bottom = "auto";
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const p = ref.current!;
    startSize.current = { w: p.offsetWidth, h: p.offsetHeight, x: e.clientX, y: e.clientY };
    const move = (ev: MouseEvent) => {
      p.style.width  = `${Math.max(420, startSize.current.w + ev.clientX - startSize.current.x)}px`;
      p.style.height = `${Math.max(300, startSize.current.h + ev.clientY - startSize.current.y)}px`;
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function handleRemovePerson(name: string) {
    if (window.confirm(`Remover todo o histórico de links de "${name}"?`)) removePerson(name);
  }

  return (
    <div id="luminus-linkwindow" className="lm-float-window" ref={ref} style={{ top: 90, left: 420 }}>
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          Luminus · Links
        </span>
        <div className="lw-header-actions">
          <span className="lw-count">{entries.length}/{all.length} pessoas</span>
          <button className="lw-close" onClick={onClose} title="Fechar"><CloseIcon /></button>
        </div>
      </div>

      <div className="lw-filterbar">
        <div className="lk-search-wrap">
          <span className="lk-search-icon"><SearchIcon /></span>
          <input
            className="lk-search-input"
            placeholder="Pesquisar pessoa ou link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="lk-gender-filters" role="group" aria-label="Filtrar por genero">
          {([
            { id: "F", label: "Feminino" },
            { id: "M", label: "Masculino" },
            { id: "unknown", label: "Sem gênero" },
          ] as const).map(item => (
            <button
              key={item.id}
              type="button"
              className={`lk-gender-toggle${genderFilter === item.id ? " active" : ""}`}
              aria-pressed={genderFilter === item.id}
              onClick={() => setGenderFilter(current => current === item.id ? "" : item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="lw-filterbar-gap" />
        <button
          className="lw-clear-btn"
          onClick={() => { if (window.confirm("Apagar todo o histórico de links?")) clearAllLinks(); }}
          title="Apaga o histórico de links de todas as pessoas"
        >
          Limpar tudo
        </button>
      </div>

      <div className="lw-filterbar lw-filterbar-secondary" role="group" aria-label="Filtrar por tipo de link">
        {LINK_FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`lw-filter-btn${linkFilter === f.id ? " active" : ""}`}
            title={f.title}
            aria-pressed={linkFilter === f.id}
            onClick={() => setLinkFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="lw-list">
        {all.length === 0 && (
          <div className="lw-empty">Nenhum link encontrado</div>
        )}
        {all.length > 0 && entries.length === 0 && (
          <div className="lw-empty">
            {query || genderFilter || linkFilter !== "all"
              ? "Nenhuma pessoa encontrada com esses filtros"
              : "Nenhuma pessoa encontrada"}
          </div>
        )}
        {entries.map(([name, links]) => (
          <div key={name} className="lk-entry">
            <div className="lk-entry-top">
              <button
                className={`lk-star${isFavorite(name) ? " active" : ""}`}
                onClick={() => toggleFavorite(name)}
                title={isFavorite(name) ? "Remover dos favoritos" : "Favoritar esta pessoa"}
              >
                <StarIcon filled={isFavorite(name)} />
              </button>
              <span
                className="lk-name"
                role="button"
                tabIndex={0}
                title="Abrir perfil"
                onClick={() => openUserProfile(api, name)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openUserProfile(api, name); }}
              >{name}</span>
              {getGenderFor(name) && (
                <span
                  className={`lk-gender-symbol gender-${getGenderFor(name)!.toLowerCase()}`}
                  title={getGenderFor(name) === "F" ? "Feminino" : "Masculino"}
                  aria-label={getGenderFor(name) === "F" ? "Feminino" : "Masculino"}
                >
                  {getGenderFor(name) === "F" ? "♀" : "♂"}
                </span>
              )}
              <span className="lk-badge" title="Links conhecidos">{links.length}</span>
              {peopleWithSharedLink.has(name) && (
                <span className="lk-badge lk-badge-dup" title="Tem link igual em outra conta">
                  duplicado
                </span>
              )}
              {links.length >= 2 && (
                <span className="lk-badge lk-badge-multi" title="Mais de um link">
                  {links.length} links
                </span>
              )}
              <button
                className="lk-remove"
                onClick={() => handleRemovePerson(name)}
                title="Remover pessoa do histórico"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="lk-links">
              {links.map(rec => {
                const others = sharedWith(name, rec.link);
                return (
                  <div key={rec.link} className={`lk-link-chip${others.length ? " is-shared" : ""}`}>
                    <a className="lk-link-main" href={toUrl(rec.link)} target="_blank" rel="noreferrer" title={`Abrir ${rec.link}`} onClick={() => recordLink(name, rec.link)}>
                      <span className="lk-link-url">{rec.link}</span>
                      <span className="lk-link-meta">
                        {others.length > 0 && (
                          <span
                            className="lk-meta-badge lk-meta-shared"
                            title={`Mesmo link em: ${others.join(", ")}`}
                          >
                            também: {others.slice(0, 3).join(", ")}{others.length > 3 ? ` +${others.length - 3}` : ""}
                          </span>
                        )}
                        {rec.gender && <span className="lk-meta-badge" title="Gênero salvo">{rec.gender}</span>}
                        <span className="lk-meta-badge" title={`${rec.clicks} clique${rec.clicks === 1 ? "" : "s"}`}>
                          <ClickIcon />{rec.clicks}
                        </span>
                        <span className="lk-meta-badge" title={`Último clique em ${fmtLastClicked(rec)}`}>
                          <ClockIcon />
                        </span>
                        <button
                          className="lk-link-remove"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); removeLink(name, rec.link); }}
                          title="Remover este link"
                        >
                          <CloseIcon />
                        </button>
                        <button
                          className="lk-link-block"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleLinkBlocked(name, rec.link); }}
                          title={isLinkBlocked(name, rec.link) ? "Desbloquear ícone" : "Bloquear ícone"}
                        >
                          {isLinkBlocked(name, rec.link) ? "Desbloquear" : "Bloquear"}
                        </button>
                      </span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}
