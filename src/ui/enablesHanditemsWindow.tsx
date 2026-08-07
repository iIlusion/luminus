import * as React from "react";
import type { LuminusApi } from "../ws/api";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import {
  beginClampedCornerResize,
  beginClampedWindowDrag,
  fitElementInSafeBounds,
} from "./windowBounds";
import {
  type CatalogEntry,
  type EnableEntry,
  type HanditemEntry,
  entryCommand,
  entryId,
  getEnables,
  getFavoriteEnables,
  getFavoriteHanditems,
  getHanditems,
  toggleFavoriteEnable,
  toggleFavoriteHanditem,
} from "./enablesHanditemsCatalog";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

type Tab = "enable" | "handitem";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

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

function CatalogCard({
  entry,
  isFavorite,
  onApply,
  onToggleFavorite,
}: {
  entry: CatalogEntry;
  isFavorite: boolean;
  onApply: () => void;
  onToggleFavorite: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const cmd = entryCommand(entry);
  const id = entryId(entry);
  const isRemove = id === 0;

  return (
    <button
      type="button"
      className={`lm-eh-card${isFavorite ? " is-fav" : ""}${isRemove ? " is-remove" : ""}`}
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${cmd} — ${entry.name}`}
    >
      <div className="lm-eh-card-top">
        <span className="lm-eh-cmd">{cmd}</span>
        {!isRemove && (isFavorite || hovered) && (
          <span
            className="lm-eh-star"
            role="button"
            tabIndex={0}
            aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }
            }}
          >
            <StarIcon on={isFavorite} />
          </span>
        )}
      </div>
      {isRemove ? (
        <div className="lm-eh-thumb lm-eh-thumb-remove" aria-hidden="true">
          <span className="lm-eh-remove-icon">✕</span>
        </div>
      ) : (
        <div
          className="lm-eh-thumb"
          style={entry.img ? { backgroundImage: `url(${entry.img})` } : undefined}
        />
      )}
      <div className="lm-eh-name">{entry.name}</div>
    </button>
  );
}

function buildList(
  mode: Tab,
  data: CatalogEntry[],
  search: string,
  favorites: number[],
): CatalogEntry[] {
  const wanted = normalizeSearch(search);
  const filtered = !wanted
    ? data
    : data.filter((item) => {
        const id = entryId(item);
        return (
          normalizeSearch(item.name).includes(wanted) ||
          String(id).includes(wanted)
        );
      });

  const result: CatalogEntry[] = [];

  if (mode === "enable") {
    result.push({
      enable: 0,
      name: "Remover efeito",
      img: "",
    });
  } else {
    result.push({
      handitem: 0,
      name: "Remover handitem",
      img: "",
    });
  }

  const favOnFiltered = favorites.filter((num) =>
    filtered.some((item) => entryId(item) === num),
  );

  for (const num of favOnFiltered) {
    const info = data.find((item) => entryId(item) === num);
    if (info) result.push({ ...info, isFavorite: true });
  }

  for (const info of filtered) {
    if (!favOnFiltered.includes(entryId(info))) {
      result.push(info);
    }
  }

  return result;
}

export function EnablesHanditemsWindow({ api, open, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tab, setTab] = React.useState<Tab>("enable");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search, 180);

  const [enables, setEnables] = React.useState<EnableEntry[] | null>(null);
  const [handitems, setHanditems] = React.useState<HanditemEntry[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [favEnables, setFavEnables] = React.useState<number[]>(() => getFavoriteEnables());
  const [favHanditems, setFavHanditems] = React.useState<number[]>(() =>
    getFavoriteHanditems(),
  );

  React.useEffect(() => {
    if (!open || !ref.current) return;
    fitElementInSafeBounds(ref.current, {
      minWidth: 360,
      minHeight: 280,
      forceHeight: true,
    });
  }, [open]);

  // Lazy-load catalog for the active tab only.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      if (tab === "enable" && enables) return;
      if (tab === "handitem" && handitems) return;

      setLoading(true);
      setError(null);
      try {
        if (tab === "enable") {
          const data = await getEnables();
          if (!cancelled) setEnables(data);
        } else {
          const data = await getHanditems();
          if (!cancelled) setHanditems(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Falha ao carregar catálogo",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, tab, enables, handitems]);

  if (!open) return null;

  const raw = tab === "enable" ? enables : handitems;
  const favorites = tab === "enable" ? favEnables : favHanditems;
  const list = raw
    ? buildList(tab, raw, debouncedSearch, favorites)
    : [];

  function apply(entry: CatalogEntry) {
    api.send(new RoomUnitChatComposer(entryCommand(entry), 0, 0));
  }

  function toggleFav(entry: CatalogEntry) {
    const id = entryId(entry);
    if (id === 0) return;
    if (tab === "enable") {
      setFavEnables(toggleFavoriteEnable(id));
    } else {
      setFavHanditems(toggleFavoriteHanditem(id));
    }
  }

  function onDragMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedWindowDrag(ref.current, e);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedCornerResize(ref.current, e, { minWidth: 360, minHeight: 280 });
  }

  return (
    <div
      id="luminus-enables-window"
      className="lm-float-window"
      ref={ref}
    >
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          Luminus · Efeitos e Handitems
        </span>
        <div className="lw-header-actions">
          {raw && (
            <span className="lw-count">
              {list.length > 0 ? list.length - 1 : 0}
              {raw.length ? `/${raw.length}` : ""}
            </span>
          )}
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

      <div className="lw-filterbar lm-eh-tabs">
        <button
          type="button"
          className={`lw-filter-btn${tab === "enable" ? " active" : ""}`}
          onClick={() => setTab("enable")}
        >
          Efeitos
        </button>
        <button
          type="button"
          className={`lw-filter-btn${tab === "handitem" ? " active" : ""}`}
          onClick={() => setTab("handitem")}
        >
          Handitems
        </button>
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
        {loading && !raw && (
          <div className="lm-eh-status">Carregando catálogo…</div>
        )}
        {error && !raw && (
          <div className="lm-eh-status lm-eh-error">
            Não foi possível carregar o catálogo.
            <br />
            <span className="lm-eh-error-detail">{error}</span>
          </div>
        )}
        {raw && list.length === 0 && (
          <div className="lm-eh-status">Nenhum item encontrado.</div>
        )}
        {raw && list.length > 0 && (
          <div className="lm-eh-grid">
            {list.map((entry) => {
              const id = entryId(entry);
              const key = `${tab}-${id}-${entry.isFavorite ? "f" : "n"}`;
              return (
                <CatalogCard
                  key={key}
                  entry={entry}
                  isFavorite={!!entry.isFavorite || favorites.includes(id)}
                  onApply={() => apply(entry)}
                  onToggleFavorite={() => toggleFav(entry)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}
