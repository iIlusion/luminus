import * as React from "react";
import { type LogEntry, getLogs, clearLogs, loadLogs, onLogsChange } from "../logs/logStore";
import { getActiveSessions, getFriendSessions, fmtDuration } from "../logs/logHandlers";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
import { handleCtrlUserClick } from "./userClickActions";

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

function avatarUrl(figure: string | undefined, size: "s" | "l" = "s"): string | undefined {
  if (!figure) return undefined;
  return `https://imaging.habblet.city/avatarimage?figure=${figure}&direction=3&head_direction=3&size=${size}`;
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

export function LogWindow({ api, open, onClose }: Props) {
  const ref     = React.useRef<HTMLDivElement>(null);
  const drag    = React.useRef({ x: 0, y: 0 });
  const startSize = React.useRef({ w: 0, h: 0, x: 0, y: 0 });

  const [filter, setFilter] = React.useState<Filter>("all");
  const [, setTick]  = React.useState(0);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => onLogsChange(() => setTick(t => t + 1)), []);
  React.useEffect(() => {
    if (!open) return;
    void loadLogs();
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const logs           = getLogs();
  const sessions       = getActiveSessions();
  const friendSessions = getFriendSessions();
  const filtered       = filter === "all" ? logs : logs.filter(e => e.type === filter);

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

  return (
    <div id="luminus-logwindow" className="lm-float-window" ref={ref}>
      {/* Header */}
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title">
          <span className="lw-title-dot" />
          Luminus · Logs
        </span>
        <div className="lw-header-actions">
          <span className="lw-count">{logs.length} eventos</span>
          <button className="lw-close" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="lw-filterbar">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={`lw-filter-btn${filter === key ? " active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {key !== "all" && <span className="lw-filter-dot" style={{ background: TYPE_COLOR[key as LogEntry["type"]] }} />}
            {label}
          </button>
        ))}
        <div className="lw-filterbar-gap" />
        <button className="lw-clear-btn" onClick={clearLogs}>Limpar</button>
      </div>

      {/* Active sessions */}
      {sessions.size > 0 && (
        <div className="lw-active-bar">
          <span className="lw-active-label">No quarto agora</span>
          {[...sessions.entries()].map(([idx, s]) => (
            <div key={idx} className="lw-active-chip">
              {avatarUrl(s.figure) && (
                <img className="lw-active-avatar" src={avatarUrl(s.figure)!} alt={s.name} />
              )}
              <span className="lw-active-name"><ProfileName api={api} name={s.name} /></span>
              <span className="lw-active-dur">{fmtDuration(now - s.ts)}</span>
              <span className="lw-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Watched friends currently online */}
      {friendSessions.size > 0 && (
        <div className="lw-active-bar">
          <span className="lw-active-label">Amigos online agora</span>
          {[...friendSessions.entries()].map(([id, s]) => (
            <div key={id} className="lw-friend-chip">
              {avatarUrl(s.figure) && (
                <img className="lw-active-avatar" src={avatarUrl(s.figure)!} alt={s.name} />
              )}
              <div className="lw-friend-info">
                <span className="lw-active-name"><ProfileName api={api} name={s.name} /></span>
                <span className="lw-friend-sub">online há {fmtDuration(now - s.onlineSince)}</span>
                <span className="lw-friend-sub">{s.roomLabel} · {fmtDuration(now - s.roomSince)}</span>
              </div>
              <span className="lw-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Log entries */}
      <div className="lw-list">
        {filtered.length === 0 && (
          <div className="lw-empty">Nenhum evento{filter !== "all" ? " nesta categoria" : ""}</div>
        )}
        {filtered.map((entry, i) => (
          <React.Fragment key={`${entry.ts}-${i}`}>
          {(i === 0 || dayKey(filtered[i - 1].ts) !== dayKey(entry.ts)) && (
            <div className="lw-day"><span>{new Date(entry.ts).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span></div>
          )}
          <div className="lw-entry" style={{ "--lw-accent": TYPE_COLOR[entry.type] } as React.CSSProperties}>
            {/* Avatar column */}
            <div className="lw-entry-avatar">
              {avatarUrl(entry.figure)
                ? <img src={avatarUrl(entry.figure)!} alt={entry.actor} />
                : <div className="lw-avatar-blank" />
              }
            </div>

            {/* Content */}
            <div className="lw-entry-content">
              <div className="lw-entry-top">
                <span className="lw-entry-name">
                  <ProfileName api={api} name={entry.actor} />
                  {entry.type === "whisper" && entry.target && <> → <ProfileName api={api} name={entry.target} /></>}
                </span>
                <span className="lw-entry-badge" style={{ color: TYPE_COLOR[entry.type], borderColor: TYPE_COLOR[entry.type] + "55" }}>
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
        ))}
      </div>

      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}
