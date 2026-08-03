import * as React from "react";
import { type LogEntry, getSessionLogs, onLogsChange } from "../logs/logStore";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
import { handleCtrlUserClick } from "./userClickActions";

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

interface Toast { id: number; entry: LogEntry; }

let nextId = 0;
const LIFETIME_MS = 4500;
const ACTOR_BUTTON_STYLE: React.CSSProperties = {
  appearance: "none",
  border: 0,
  padding: 0,
  background: "transparent",
  font: "inherit",
};

export function LogToast({ api }: { api: LuminusApi }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const lastTsRef = React.useRef<number>(getSessionLogs()[0]?.ts ?? 0);

  React.useEffect(() => {
    return onLogsChange(() => {
      const latest = getSessionLogs()[0];
      if (!latest || latest.ts <= lastTsRef.current) return;
      lastTsRef.current = latest.ts;
      // Toast for friend log, room monitor, and clicks — not whispers.
      if (latest.type === "whisper") return;
      const id = nextId++;
      setToasts(prev => [...prev, { id, entry: latest }]);
      window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), LIFETIME_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div id="luminus-toast-stack">
      {toasts.map(({ id, entry }) => (
        <div
          key={id}
          className="lm-toast"
          style={{ "--lm-toast-accent": TYPE_COLOR[entry.type] } as React.CSSProperties}
        >
          <span className="lm-toast-badge">{TYPE_LABEL[entry.type]}</span>
          <button
            type="button"
            className="lm-toast-actor"
            style={ACTOR_BUTTON_STYLE}
            onClick={event => {
              if (handleCtrlUserClick(event, api, entry.actor)) return;
              openUserProfile(api, entry.actor);
            }}
            title="Abrir perfil"
          >
            {entry.actor}
          </button>
          <span className="lm-toast-msg">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
