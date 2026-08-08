import * as React from "react";
import type { LuminusApi } from "../ws/api";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import {
  beginClampedCornerResize,
  beginClampedWindowDrag,
  fitElementInSafeBounds,
} from "./windowBounds";
import {
  buildCatalogList,
  type CatalogEntry,
  entryCommand,
  entryId,
  getCatalogEntries,
  getCatalogFavorites,
  toggleCatalogFavorite,
} from "./enablesHanditemsCatalog";
import {
  CatalogThumbStage,
  useCatalogThumbResource,
} from "./catalogThumbPlayer";
import type { CatalogThumbKind } from "./catalogThumbManifest";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

const TABS: ReadonlyArray<{ kind: CatalogThumbKind; label: string }> = [
  { kind: "enable", label: "Efeitos" },
  { kind: "handitem", label: "Handitems" },
];

const StarIcon = ({ on }: { on: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill={on ? "#f5c542" : "none"}
      stroke={on ? "#f5c542" : "currentColor"}
      strokeWidth="1.8"
      strokeLinejoin="round"
      d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 16.9 6.8 19.7l1-5.8L3.5 9.7l5.9-.9L12 3.5z"
    />
  </svg>
);

function useInView(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const root = el.closest(".lm-eh-body");

    const io = new IntersectionObserver(
      (entries) => {
        setInView(entries.some((entry) => entry.isIntersecting));
      },
      { root: root instanceof Element ? root : null, rootMargin: "0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView];
}

function CatalogCard({
  entry,
  mode,
  isFavorite,
  onApply,
  onToggleFavorite,
}: {
  entry: CatalogEntry;
  mode: CatalogThumbKind;
  isFavorite: boolean;
  onApply: () => void;
  onToggleFavorite: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [retryToken, setRetryToken] = React.useState(0);
  const [cardRef, inView] = useInView();
  const cmd = entryCommand(entry);
  const id = entryId(entry);
  const isRemove = id === 0;
  const thumb = useCatalogThumbResource(mode, id, inView, retryToken);
  const isPlaying = inView && (hovered || focused);
  const unavailableLabel = thumb.status === "unavailable"
    ? "Thumbnail fiel indisponível para este item"
    : null;

  return (
    <div
      ref={cardRef}
      className={`lm-eh-card-shell${inView ? " is-visible" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <button
        type="button"
        className={`lm-eh-card${isFavorite ? " is-fav" : ""}${isRemove ? " is-remove" : ""}`}
        onClick={onApply}
        title={`${cmd} — ${entry.name}`}
      >
        <div className="lm-eh-card-top">
          <span className="lm-eh-cmd">{cmd}</span>
        </div>
        {isRemove ? (
          <div className="lm-eh-thumb lm-eh-thumb-remove" aria-hidden="true">
            <span className="lm-eh-remove-icon">×</span>
          </div>
        ) : (
          <div
            className={`lm-eh-thumb is-${thumb.status}`}
            title={unavailableLabel ?? (thumb.status === "error" ? thumb.message : undefined)}
          >
            {thumb.status === "ready" && (
              <CatalogThumbStage
                resource={thumb.resource}
                playing={isPlaying}
                kind={mode}
                id={id}
              />
            )}
            {thumb.status === "unavailable" && (
              <span className="lm-eh-thumb-message">Sem prévia fiel</span>
            )}
          </div>
        )}
        <div className="lm-eh-name">{entry.name}</div>
      </button>
      {!isRemove && (
        <button
          type="button"
          className={`lm-eh-star${isFavorite ? " is-active" : ""}`}
          aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
          onClick={onToggleFavorite}
        >
          <StarIcon on={isFavorite} />
        </button>
      )}
      {thumb.status === "error" && (
        <button
          type="button"
          className="lm-eh-thumb-retry"
          onClick={() => setRetryToken((value) => value + 1)}
          aria-label="Tentar carregar a thumbnail novamente"
          title="Tentar novamente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0 2 5" />
            <path d="M20 4v7h-7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function EnablesHanditemsWindow({ api, open, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tab, setTab] = React.useState<CatalogThumbKind>("enable");
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [favorites, setFavorites] = React.useState<Record<CatalogThumbKind, number[]>>(() => ({
    enable: getCatalogFavorites("enable"),
    handitem: getCatalogFavorites("handitem"),
  }));

  React.useEffect(() => {
    if (!open || !ref.current) return;
    fitElementInSafeBounds(ref.current, {
      minWidth: 360,
      minHeight: 280,
      forceHeight: true,
    });
  }, [open]);

  if (!open) return null;

  const raw = getCatalogEntries(tab);
  const activeFavorites = favorites[tab];
  const list = buildCatalogList(tab, deferredSearch, activeFavorites);

  function apply(entry: CatalogEntry) {
    api.send(new RoomUnitChatComposer(entryCommand(entry), 0, 0));
  }

  function toggleFav(entry: CatalogEntry) {
    const id = entryId(entry);
    if (id === 0) return;
    const next = toggleCatalogFavorite(tab, id);
    setFavorites((current) => ({ ...current, [tab]: next }));
  }

  function onDragMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedWindowDrag(ref.current, e);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedCornerResize(ref.current, e, { minWidth: 360, minHeight: 280 });
  }

  function onCatalogWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (e.ctrlKey || !ref.current) return;
    const body = ref.current.querySelector<HTMLElement>(".lm-eh-body");
    if (!body || e.deltaY === 0) return;
    const multiplier = e.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? body.clientHeight
        : 1;
    body.scrollTop += e.deltaY * multiplier;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      id="luminus-enables-window"
      className="lm-float-window"
      ref={ref}
      onWheelCapture={onCatalogWheel}
    >
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          Luminus · Efeitos e Handitems
        </span>
        <div className="lw-header-actions">
          <span className="lw-count">{list.length - 1}/{raw.length}</span>
          <button
            className="lw-close"
            onClick={onClose}
            type="button"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="lw-filterbar">
        {TABS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            className={`lw-filter-btn${tab === kind ? " active" : ""}`}
            onClick={() => setTab(kind)}
          >
            {label}
          </button>
        ))}
        <div className="lw-filterbar-gap" />
      </div>

      <div className="lw-search-bar">
        <span className="lw-search-icon" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          className="lw-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar nome ou id…"
          aria-label="Pesquisar efeitos e handitems"
        />
        {search && (
          <button
            type="button"
            className="lw-search-clear"
            onClick={() => setSearch("")}
            aria-label="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>

      <div className="lm-eh-body">
        <div className="lm-eh-grid">
          {list.map((entry) => {
            const id = entryId(entry);
            return (
              <CatalogCard
                key={`${tab}-${id}`}
                entry={entry}
                mode={tab}
                isFavorite={activeFavorites.includes(id)}
                onApply={() => apply(entry)}
                onToggleFavorite={() => toggleFav(entry)}
              />
            );
          })}
        </div>
      </div>

      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}
