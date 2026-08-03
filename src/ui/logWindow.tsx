import * as React from "react";
import { type LogEntry, getLogs, clearLogs, loadLogs, onLogsChange } from "../logs/logStore";
import { getActiveSessions, getFriendSessions, fmtDuration } from "../logs/logHandlers";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
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

type Filter = "all" | LogEntry["type"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",        label: "Tudo"   },
  { key: "click",      label: "Click"  },
  { key: "whisper",    label: "Susu"   },
  { key: "friend",     label: "Amigo"  },
  { key: "room_enter", label: "Entrou" },
  { key: "room_leave", label: "Saiu"   },
];

const TYPE_COLOR: Record<LogEntry["type"], string> = {
  click:      "#ff9f43",
  whisper:    "#8ea2ff",
  friend:     "#26de81",
  room_enter: "#54a0ff",
  room_leave: "#c44569",
};

const TYPE_LABEL: Record<LogEntry["type"], string> = {
  click:      "Click",
  whisper:    "Susu",
  friend:     "Amigo",
  room_enter: "Entrou",
  room_leave: "Saiu",
};

const LOG_PAGE_SIZE = 150;

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => n.toString().padStart(2, "0")).join(":");
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const day = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return `${day} ${fmtTime(ts)}`;
}

function dayKey(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayHeading(ts: number): { title: string; relative: string } {
  const date = new Date(ts);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startThat) / 86_400_000);
  const title = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  let relative = "";
  if (dayDiff === 0) relative = "Hoje";
  else if (dayDiff === 1) relative = "Ontem";
  else if (dayDiff > 1 && dayDiff < 7) relative = `${dayDiff} dias atrás`;
  return { title, relative };
}

function avatarUrl(figure: string | undefined, size: "s" | "l" = "s"): string | undefined {
  if (!figure) return undefined;
  return `https://imaging.habblet.city/avatarimage?figure=${figure}&direction=3&head_direction=3&size=${size}`;
}

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ProfileName({ api, name }: { api: LuminusApi; name: string }) {
  return (
    <span
      className="luminus-profile-link"
      role="button"
      tabIndex={0}
      onClick={event => {
        if (handleCtrlUserClick(event, api, name)) return;
        openUserProfile(api, name);
      }}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openUserProfile(api, name);
        }
      }}
    >
      {name}
    </span>
  );
}

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);

export function LogWindow({ api, open, onClose }: Props) {
  const ref     = React.useRef<HTMLDivElement>(null);

  const [filter, setFilter] = React.useState<Filter>("all");
  const [search, setSearch] = React.useState("");
  const [, setTick]  = React.useState(0);
  const [now, setNow] = React.useState(Date.now());

  const [visibleCount, setVisibleCount] = React.useState(LOG_PAGE_SIZE);
  React.useEffect(() => onLogsChange(() => setTick(t => t + 1)), []);
  React.useEffect(() => {
    if (!open) return;
    void loadLogs();
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  React.useEffect(() => {
    setVisibleCount(LOG_PAGE_SIZE);
  }, [open, filter, search]);

  React.useEffect(() => {
    if (!open || !ref.current) return;
    fitElementInSafeBounds(ref.current, { minWidth: 360, minHeight: 260, forceHeight: true });
  }, [open]);

  if (!open) return null;

  const logs           = getLogs();
  const sessions       = getActiveSessions();
  const friendSessions = getFriendSessions();
  const wanted = normalizeSearch(search);

  const byType = filter === "all" ? logs : logs.filter(e => e.type === filter);
  const filtered = !wanted
    ? byType
    : byType.filter(e => {
        const hay = [
          e.actor,
          e.target ?? "",
          e.message,
          TYPE_LABEL[e.type],
          ...(e.groupMembers ?? []),
        ].join(" ");
        return normalizeSearch(hay).includes(wanted);
      });
  const visible = filtered.slice(0, visibleCount);

  const roomPeople = [...sessions.entries()]
    .map(([idx, s]) => ({ idx, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const friendsOnline = [...friendSessions.entries()]
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  function onDragMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedWindowDrag(ref.current, e);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    beginClampedCornerResize(ref.current, e, { minWidth: 360, minHeight: 260 });
  }

  return (
    <div id="luminus-logwindow" className="lm-float-window" ref={ref}>
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          Luminus · Logs
        </span>
        <div className="lw-header-actions">
          <span className="lw-count">
            {wanted || filter !== "all"
              ? `${filtered.length}/${logs.length}`
              : `${logs.length}`} eventos
          </span>
          <button className="lw-close" onClick={onClose} type="button" aria-label="Fechar">✕</button>
        </div>
      </div>

      <div className="lw-filterbar">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`lw-filter-btn${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {key !== "all" && <span className="lw-filter-dot" style={{ background: TYPE_COLOR[key as LogEntry["type"]] }} />}
            {label}
          </button>
        ))}
        <div className="lw-filterbar-gap" />
        <button type="button" className="lw-clear-btn" onClick={clearLogs}>Limpar</button>
      </div>

      <div className="lw-search-bar">
        <span className="lw-search-icon" aria-hidden="true"><SearchIcon /></span>
        <input
          className="lw-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar nick, mensagem, tipo…"
          aria-label="Buscar nos logs"
        />
        {search && (
          <button
            type="button"
            className="lw-search-clear"
            onClick={() => setSearch("")}
            title="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>

      {/* Presence: room + friends — compact horizontal strips */}
      {(roomPeople.length > 0 || friendsOnline.length > 0) && (
        <div className="lw-presence">
          {roomPeople.length > 0 && (
            <section className="lw-presence-section is-room">
              <header className="lw-presence-head">
                <span className="lw-presence-title">No quarto</span>
                <span className="lw-presence-count">{roomPeople.length}</span>
              </header>
              <div className="lw-presence-scroll">
                {roomPeople.map(s => (
                  <div key={s.idx} className="lw-presence-chip is-room" title={`No quarto há ${fmtDuration(now - s.ts)}`}>
                    {avatarUrl(s.figure)
                      ? <img className="lw-presence-avatar" src={avatarUrl(s.figure)!} alt="" />
                      : <span className="lw-presence-avatar is-blank">{s.name.slice(0, 1).toUpperCase()}</span>}
                    <span className="lw-presence-name"><ProfileName api={api} name={s.name} /></span>
                    <span className="lw-presence-meta">{fmtDuration(now - s.ts)}</span>
                    <span className="lw-pulse" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>
          )}
          {friendsOnline.length > 0 && (
            <section className="lw-presence-section is-friend">
              <header className="lw-presence-head">
                <span className="lw-presence-title">Amigos online</span>
                <span className="lw-presence-count">{friendsOnline.length}</span>
              </header>
              <div className="lw-presence-scroll">
                {friendsOnline.map(s => (
                  <div
                    key={s.id}
                    className="lw-presence-chip is-friend"
                    title={[
                      `Online há ${fmtDuration(now - s.onlineSince)}`,
                      s.roomLabel,
                      s.userCount > 0 || s.maxUserCount > 0
                        ? `${s.userCount}/${s.maxUserCount} no quarto`
                        : "",
                    ].filter(Boolean).join(" · ")}
                  >
                    {avatarUrl(s.figure)
                      ? <img className="lw-presence-avatar" src={avatarUrl(s.figure)!} alt="" />
                      : <span className="lw-presence-avatar is-blank">{s.name.slice(0, 1).toUpperCase()}</span>}
                    <div className="lw-presence-text">
                      <span className="lw-presence-name"><ProfileName api={api} name={s.name} /></span>
                      <span className="lw-presence-sub">
                        <span className="lw-presence-online">online {fmtDuration(now - s.onlineSince)}</span>
                        {s.roomLabel && <span className="lw-presence-room">{s.roomLabel}</span>}
                      </span>
                    </div>
                    <span className="lw-pulse" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div
        className="lw-list"
        onScroll={event => {
          const list = event.currentTarget;
          if (list.scrollTop + list.clientHeight >= list.scrollHeight - 80) {
            setVisibleCount(count => Math.min(count + LOG_PAGE_SIZE, filtered.length));
          }
        }}
      >
        {filtered.length === 0 && (
          <div className="lw-empty">
            {logs.length === 0
              ? "Nenhum evento registrado"
              : wanted
                ? "Nenhum evento corresponde à busca"
                : filter !== "all"
                  ? "Nenhum evento nesta categoria"
                  : "Nenhum evento"}
          </div>
        )}
        {visible.map((entry, i) => {
          const prev = i > 0 ? filtered[i - 1] : null;
          const showDay = !prev || dayKey(prev.ts) !== dayKey(entry.ts);
          const day = showDay ? formatDayHeading(entry.ts) : null;
          return (
            <React.Fragment key={`${entry.ts}-${entry.type}-${entry.actor}-${i}`}>
              {day && (
                <div className="lw-day" role="separator" aria-label={day.title}>
                  <span className="lw-day-line" aria-hidden="true" />
                  <span className="lw-day-pill">
                    {day.relative && <strong className="lw-day-rel">{day.relative}</strong>}
                    <span className="lw-day-title">{day.title}</span>
                  </span>
                  <span className="lw-day-line" aria-hidden="true" />
                </div>
              )}
              <div className="lw-entry" style={{ "--lw-accent": TYPE_COLOR[entry.type] } as React.CSSProperties}>
                <div className="lw-entry-avatar">
                  {avatarUrl(entry.figure)
                    ? <img src={avatarUrl(entry.figure)!} alt="" />
                    : <div className="lw-avatar-blank" />}
                </div>
                <div className="lw-entry-content">
                  <div className="lw-entry-top">
                    <span className="lw-entry-name">
                      <ProfileName api={api} name={entry.actor} />
                      {entry.type === "whisper" && entry.target && <> → <ProfileName api={api} name={entry.target} /></>}
                    </span>
                    <span
                      className="lw-entry-badge"
                      style={{ color: TYPE_COLOR[entry.type], borderColor: TYPE_COLOR[entry.type] + "55" }}
                    >
                      {TYPE_LABEL[entry.type]}
                    </span>
                    <span className="lw-entry-time">{fmtDate(entry.ts)}</span>
                  </div>
                  <div className="lw-entry-msg">{entry.message}</div>
                  {entry.duration != null && (
                    <div className="lw-entry-dur">Duração total: {fmtDuration(entry.duration)}</div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}
