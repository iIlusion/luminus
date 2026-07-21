import * as React from "react";
import { type LogEntry, getLogs, onLogsChange } from "../logs/logStore";

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

export function LogToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const lastTsRef = React.useRef<number>(getLogs()[0]?.ts ?? 0);

  React.useEffect(() => {
    return onLogsChange(() => {
      const latest = getLogs()[0];
      if (!latest || latest.ts <= lastTsRef.current) return;
      lastTsRef.current = latest.ts;
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
          <span className="lm-toast-actor">{entry.actor}</span>
          <span className="lm-toast-msg">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
