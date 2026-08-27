import * as React from "react";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
import {
  getAllLinks, onLinksChange, recordLink, fmtLastClicked,
  isFavorite, toggleFavorite, removePerson, removeLink, clearAllLinks,
  isLinkBlocked, toggleLinkBlocked, getGenderFor, type LinkRecord,
} from "../links/linkStore";
import { toUrl } from "../links/linkDomains";
import { handleCtrlUserClick } from "./userClickActions";
import {
  beginClampedCornerResize,
  beginClampedWindowDrag,
  fitElementInSafeBounds,
} from "./windowBounds";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

const LINK_PAGE_SIZE = 30;

/** Normalize link for duplicate detection across accounts. */
function linkKey(link: string): string {
  return link.trim().toLowerCase().replace(/\/+$/, "");
}

/** Combinable link filters (AND). Empty set = show everyone. */
type LinkFilterId = "multi" | "dup" | "blocked" | "favorites" | "unopened";

const LINK_FILTERS: { id: LinkFilterId; label: string; title: string }[] = [
  { id: "multi", label: "Vários links", title: "Pessoas com mais de um link (combinável)" },
  { id: "dup", label: "Link duplicado", title: "Mesmo link em duas ou mais contas (combinável)" },
  { id: "blocked", label: "Bloqueados", title: "Pessoas com algum link bloqueado (combinável)" },
  { id: "favorites", label: "Favoritos", title: "Somente favoritos (combinável)" },
  { id: "unopened", label: "Não abertos", title: "Ainda não clicou em nenhum link dessa pessoa (combinável)" },
];

function personMatchesLinkFilter(
  id: LinkFilterId,
  name: string,
  links: LinkRecord[],
  peopleWithSharedLink: Set<string>,
): boolean {
  if (id === "multi") return links.length >= 2;
  if (id === "dup") return peopleWithSharedLink.has(name);
  if (id === "blocked") return links.some(r => r.blocked === true);
  if (id === "favorites") return isFavorite(name);
  if (id === "unopened") return links.every(r => (r.clicks ?? 0) === 0);
  return true;
}

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

/** Ban / block circle — color via CSS currentColor (gray off, red on). */
const BlockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M6.5 6.5l11 11" />
  </svg>
);

export function LinkWindow({ api, open, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, setTick] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(LINK_PAGE_SIZE);
  /** Active link filters — multiple can be on at once (AND). */
  const [linkFilters, setLinkFilters] = React.useState<Set<LinkFilterId>>(() => new Set());
  React.useEffect(() => onLinksChange(() => setTick(value => value + 1)), []);
  React.useEffect(() => setVisibleCount(LINK_PAGE_SIZE), [search, genderFilter, linkFilters, open]);
  React.useEffect(() => {
    if (!open || !ref.current) return;
    // Prefer a wider shell so multi-link rows can sit horizontally.
    fitElementInSafeBounds(ref.current, { minWidth: 480, minHeight: 260, forceHeight: true });
    ref.current.focus({ preventScroll: true });
  }, [open]);

  function toggleLinkFilter(id: LinkFilterId) {
    setLinkFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearLinkFilters() {
    setLinkFilters(new Set());
  }

  if (!open) return null;

  const all = Object.entries(getAllLinks());
  const sharedByLink = buildSharedLinkIndex(all);
  const peopleWithSharedLink = new Set<string>();
  for (const names of sharedByLink.values()) {
    for (const name of names) peopleWithSharedLink.add(name);
  }

  const query = search.trim().toLowerCase();
  const activeFilters = [...linkFilters];
  const filtered = all.filter(([name, links]) => {
    const matchesSearch = !query
      || name.toLowerCase().includes(query)
      || links.some(record => record.link.toLowerCase().includes(query));
    const gender = getGenderFor(name);
    const matchesGender = !genderFilter
      || (genderFilter === "unknown" ? !gender : gender === genderFilter);
    const matchesLink = activeFilters.length === 0
      || activeFilters.every(id => personMatchesLinkFilter(id, name, links, peopleWithSharedLink));
    return matchesSearch && matchesGender && matchesLink;
  });
  const entries = [...filtered].sort(([a], [b]) => {
    const favoriteA = isFavorite(a);
    const favoriteB = isFavorite(b);
    if (favoriteA !== favoriteB) return favoriteA ? -1 : 1;
    return a.localeCompare(b);
  });
  const visibleEntries = entries.slice(0, visibleCount);

  function sharedWith(name: string, link: string): string[] {
    const others = sharedByLink.get(linkKey(link));
    if (!others) return [];
    return others.filter(n => n !== name);
  }

  function onListScroll(event: React.UIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    if (list.scrollHeight - list.scrollTop - list.clientHeight > 240) return;
    setVisibleCount(count => Math.min(entries.length, count + LINK_PAGE_SIZE));
  }

  function onDragMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedWindowDrag(ref.current, e);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedCornerResize(ref.current, e, { minWidth: 440, minHeight: 260 });
  }

  function handleRemovePerson(name: string) {
    if (window.confirm(`Remover todo o histórico de links de "${name}"?`)) removePerson(name);
  }

  return (
    <div id="luminus-linkwindow" className="lm-float-window" ref={ref} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="luminus-linkwindow-title">
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          <span id="luminus-linkwindow-title">Luminus · Links</span>
        </span>
        <div className="lw-header-actions">
          <span className="lw-count">{entries.length}/{all.length} pessoas</span>
          <button className="lw-close" type="button" onClick={onClose} title="Fechar" aria-label="Fechar histórico de links"><CloseIcon /></button>
        </div>
      </div>

      <div className="lw-filterbar">
        <div className="lk-search-wrap">
          <span className="lk-search-icon"><SearchIcon /></span>
          <input
            className="lk-search-input"
            type="search"
            placeholder="Pesquisar pessoa ou link..."
            aria-label="Pesquisar pessoa ou link"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="lk-gender-filters" role="group" aria-label="Filtrar por gênero">
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
          type="button"
          className="lw-clear-btn"
          onClick={() => { if (window.confirm("Apagar todo o histórico de links?")) clearAllLinks(); }}
          title="Apaga o histórico de links de todas as pessoas"
        >
          Limpar tudo
        </button>
      </div>

      <div className="lw-filterbar lw-filterbar-secondary" role="group" aria-label="Filtrar por tipo de link (combináveis)">
        <button
          type="button"
          className={`lw-filter-btn${linkFilters.size === 0 ? " active" : ""}`}
          title="Limpar filtros de tipo (mostrar todos)"
          aria-pressed={linkFilters.size === 0}
          onClick={clearLinkFilters}
        >
          Todos
        </button>
        {LINK_FILTERS.map(f => {
          const on = linkFilters.has(f.id);
          return (
            <button
              key={f.id}
              type="button"
              className={`lw-filter-btn${on ? " active" : ""}`}
              title={f.title}
              aria-pressed={on}
              onClick={() => toggleLinkFilter(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="lw-list" onScroll={onListScroll}>
        {all.length === 0 && (
          <div className="lw-empty">Nenhum link encontrado</div>
        )}
        {all.length > 0 && entries.length === 0 && (
          <div className="lw-empty">
            {query || genderFilter || linkFilters.size > 0
              ? "Nenhuma pessoa encontrada com esses filtros"
              : "Nenhuma pessoa encontrada"}
          </div>
        )}
        {visibleEntries.map(([name, links]) => (
          <div key={name} className="lk-entry">
            <div className="lk-entry-top">
              <button
                type="button"
                className={`lk-star${isFavorite(name) ? " active" : ""}`}
                onClick={() => toggleFavorite(name)}
                title={isFavorite(name) ? "Remover dos favoritos" : "Favoritar esta pessoa"}
                aria-label={isFavorite(name) ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
                aria-pressed={isFavorite(name)}
              >
                <StarIcon filled={isFavorite(name)} />
              </button>
              <button
                type="button"
                className="lk-name"
                title="Abrir perfil"
                aria-label={`Abrir perfil de ${name}`}
                onClick={event => {
                  if (handleCtrlUserClick(event, api, name)) return;
                  openUserProfile(api, name);
                }}
              >{name}</button>
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
                type="button"
                className="lk-remove"
                onClick={() => handleRemovePerson(name)}
                title="Remover pessoa do histórico"
                aria-label={`Remover ${name} do histórico`}
              >
                <TrashIcon />
              </button>
            </div>
            <div className="lk-links">
              {links.map(rec => {
                const others = sharedWith(name, rec.link);
                const blocked = isLinkBlocked(name, rec.link);
                return (
                  <div key={rec.link} className={`lk-link-chip${others.length ? " is-shared" : ""}`}>
                    <a
                      className="lk-link-main"
                      href={toUrl(rec.link)}
                      target="_blank"
                      rel="noreferrer"
                      title={`${rec.link}${others.length ? `\nTambém em: ${others.join(", ")}` : ""}\n${rec.clicks} clique(s) · ${fmtLastClicked(rec)}`}
                      onClick={() => recordLink(name, rec.link)}
                    >
                      <span className="lk-link-url">{rec.link}</span>
                      <span className="lk-link-meta">
                        {others.length > 0 && (
                          <span
                            className="lk-meta-badge lk-meta-shared"
                            title={`Mesmo link em: ${others.join(", ")}`}
                          >
                            +{others.length}
                          </span>
                        )}
                        <span className="lk-meta-badge" title={`${rec.clicks} clique${rec.clicks === 1 ? "" : "s"}`}>
                          <ClickIcon />{rec.clicks}
                        </span>
                        <span className="lk-meta-badge" title={`Último clique: ${fmtLastClicked(rec)}`}>
                          <ClockIcon />
                        </span>
                      </span>
                    </a>
                    <span className="lk-link-actions" aria-label={`Ações para ${rec.link}`}>
                      <button
                        type="button"
                        className={`lk-link-block${blocked ? " is-active" : ""}`}
                        onClick={() => toggleLinkBlocked(name, rec.link)}
                        title={blocked ? "Desbloquear ícone" : "Bloquear ícone"}
                        aria-pressed={blocked}
                        aria-label={blocked ? "Desbloquear ícone" : "Bloquear ícone"}
                      >
                        <BlockIcon />
                      </button>
                      <button
                        type="button"
                        className="lk-link-remove"
                        onClick={() => removeLink(name, rec.link)}
                        title="Remover este link"
                        aria-label="Remover este link"
                      >
                        <CloseIcon />
                      </button>
                    </span>
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
