import * as React from "react";
import { getLogs, getSessionLogs, loadLogs, onLogsChange, removeLogs, type LogEntry } from "../logs/logStore";
import { createWhisperUserContact, getWhisperContacts, getWhisperConversationKey, getWhisperThread, groupWhispersByDay, hasDirectWhisperHistory, type WhisperContact } from "../logs/whisperThreads";
import { RoomUnitWhisperComposer } from "../messages/outgoing/RoomUnitWhisperComposer";
import { NativeGroupWhisperMemberComposer } from "../messages/outgoing/NativeGroupWhisperMemberComposer";
import type { LuminusApi } from "../ws/api";
import { openUserProfile } from "./profileLinks";
import { withGroupWhisperRoute } from "../chat/groupWhisperRouting";
import { isWhisperAntispamEnabled, setWhisperAntispamEnabled } from "../chat/whisperQueue";
import { clearNativeGroupWhisperInput, resetNativeGroupMembers } from "../chat/nativeGroupWhisperReset";
import { handleCtrlUserClick } from "./userClickActions";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (key === todayKey) return "Hoje";
  if (key === yesterdayKey) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function avatarUrl(figure: string | undefined): string | undefined {
  return figure
    ? `https://imaging.habblet.city/avatarimage?figure=${figure}&direction=3&head_direction=3&size=s`
    : undefined;
}

const UNREAD_BADGE_STYLE: React.CSSProperties = {
  minWidth: 17,
  height: 17,
  padding: "0 5px",
  borderRadius: 999,
  background: "#ff5470",
  color: "#fff",
  fontSize: 10,
  fontWeight: 800,
  lineHeight: "17px",
  textAlign: "center",
  boxShadow: "0 0 8px rgba(255, 84, 112, 0.45)",
};

const THREAD_ACTIONS_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  flexShrink: 0,
};

const DELETE_MESSAGE_STYLE: React.CSSProperties = {
  width: 15,
  height: 15,
  borderRadius: 5,
  color: "#ff9f9f",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: "15px",
  textAlign: "center",
};

const TAB_CLOSE_STYLE: React.CSSProperties = {
  width: 18,
  height: 18,
  minWidth: 18,
  padding: 0,
  marginLeft: -3,
  borderRadius: 6,
  color: "#ff9f9f",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: "18px",
  textAlign: "center",
};

type VisibleLogEntry = LogEntry & { sourceKeys?: string[] };

export function WhisperWindow({ api, open, onClose }: Props) {
  const windowRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ x: 0, y: 0 });
  const startSize = React.useRef({ width: 0, height: 0, x: 0, y: 0 });
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [manualContacts, setManualContacts] = React.useState<WhisperContact[]>([]);
  const [closedKeys, setClosedKeys] = React.useState<string[]>([]);
  const [recipient, setRecipient] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [error, setError] = React.useState("");
  const [antispamEnabled, setAntispamEnabled] = React.useState(() => isWhisperAntispamEnabled());
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>({});
  const seenLogKeys = React.useRef<Set<string> | null>(null);
  const [logsVersion, setLogsVersion] = React.useState(0);

  React.useEffect(() => onLogsChange(() => setLogsVersion(version => version + 1)), []);
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoadingHistory(true);
    void loadLogs().finally(() => { if (mounted) setLoadingHistory(false); });
    return () => { mounted = false; };
  }, [open]);

  const myself = api.myself?.username ?? "";
  const logs = React.useMemo(() => getLogs(), [logsVersion]);
  const sessionContacts = React.useMemo(() => getWhisperContacts(getSessionLogs(), myself), [logsVersion, myself]);
  const historyContacts = React.useMemo(() => getWhisperContacts(logs, myself), [logs, myself]);
  const directHistoryKeys = React.useMemo(() => new Set(
    historyContacts
      .filter(contact => contact.kind === "user" && hasDirectWhisperHistory(logs, myself, contact.key))
      .map(contact => contact.key)
  ), [historyContacts, logs, myself]);
  const contacts = React.useMemo(() => uniqueContacts([...manualContacts, ...sessionContacts])
    .filter(contact => !closedKeys.includes(contact.key)), [manualContacts, sessionContacts, closedKeys]);
  const contactKeys = React.useMemo(() => contacts.map(contact => contact.key).join("\u0000"), [contacts]);
  const activeContact = React.useMemo(() => contacts.find(contact => contact.key === activeKey) ?? null, [contacts, activeKey]);
  const messages = React.useMemo(() => activeContact ? getWhisperThread(logs, myself, activeContact) : [], [logs, myself, activeContact]);
  const visibleMessages = React.useMemo(() => groupClickMessages(messages), [messages]);
  const days = React.useMemo(() =>
    groupWhispersByDay(visibleMessages) as Array<{ key: string; ts: number; entries: VisibleLogEntry[] }>,
  [visibleMessages]);
  const roomUsers = React.useMemo(() => [...api.room.units.values()]
    .filter(unit => unit.type === 1 && !sameName(unit.name, myself))
    .sort((a, b) => a.name.localeCompare(b.name)), [api.room.units.size, logsVersion, myself]);
  const activeUnit = activeContact?.kind === "user"
    ? roomUsers.find(unit => sameName(unit.name, activeContact.recipient))
    : undefined;
  const canSend = Boolean(activeContact && (activeContact.kind === "group" || activeUnit));
  const userOptions = React.useMemo(() => uniqueNames([
    ...roomUsers.map(unit => unit.name),
    ...historyContacts.filter(contact => contact.kind === "user").map(contact => contact.recipient),
  ]), [roomUsers, historyContacts]);

  React.useEffect(() => {
    if (activeKey && !contacts.some(contact => contact.key === activeKey)) {
      setActiveKey(contacts[0]?.key ?? null);
    } else if (!activeKey && contacts[0] && !unreadCounts[contacts[0].key]) {
      setActiveKey(contacts[0].key);
    }
  }, [activeKey, contactKeys, unreadCounts]);

  React.useLayoutEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, activeKey, messages.length]);

  React.useEffect(() => {
    if (seenLogKeys.current === null || loadingHistory) {
      seenLogKeys.current = new Set(logs.map(logEntryKey));
      return;
    }

    const nextSeen = new Set(seenLogKeys.current);
    const unread: Record<string, number> = {};
    for (const entry of logs) {
      const entryKey = logEntryKey(entry);
      if (nextSeen.has(entryKey)) continue;
      nextSeen.add(entryKey);
      const contactKey = getWhisperConversationKey(entry, myself);
      if (!contactKey || sameName(entry.actor, myself) || (open && contactKey === activeKey)) continue;
      if (entry.type === "click" && !directHistoryKeys.has(contactKey)) continue;
      unread[contactKey] = (unread[contactKey] ?? 0) + 1;
    }
    seenLogKeys.current = nextSeen;
    if (Object.keys(unread).length) {
      const unreadKeys = Object.keys(unread);
      setClosedKeys(current => current.filter(key => !unreadKeys.includes(key)));
      setUnreadCounts(current => {
        const next = { ...current };
        for (const [key, count] of Object.entries(unread)) next[key] = (next[key] ?? 0) + count;
        return next;
      });
    }
  }, [logs, myself, activeKey, open, loadingHistory, directHistoryKeys]);

  React.useEffect(() => {
    if (!open || !activeKey) return;
    setUnreadCounts(current => {
      if (!current[activeKey]) return current;
      const next = { ...current };
      delete next[activeKey];
      return next;
    });
  }, [open, activeKey]);

  if (!open) return null;

  function selectContact(contact: WhisperContact): void {
    setActiveKey(contact.key);
    setError("");
  }

  function openContact(contact: WhisperContact): void {
    setManualContacts(current => current.some(item => item.key === contact.key) ? current : [contact, ...current]);
    setClosedKeys(current => current.filter(key => key !== contact.key));
    setActiveKey(contact.key);
    setRecipient("");
    setError("");
  }

  function closeOpenChats(): void {
    if (!contacts.length) return;
    setClosedKeys(current => uniqueNames([...current, ...contacts.map(contact => contact.key)]));
    setManualContacts([]);
    setActiveKey(null);
    setError("");
  }

  function closeContact(contact: WhisperContact): void {
    setClosedKeys(current => uniqueNames([...current, contact.key]));
    setManualContacts(current => current.filter(item => item.key !== contact.key));
    if (activeKey === contact.key) setActiveKey(null);
    setError("");
  }

  function toggleAntispam(enabled: boolean): void {
    setWhisperAntispamEnabled(enabled);
    setAntispamEnabled(enabled);
  }

  function clearNativeGroup(): void {
    setError(clearNativeGroupWhisperInput(api) ? "" : "Nenhum grupo nativo ativo no chat do Habblet.");
  }

  function deleteMessage(entry: VisibleLogEntry): void {
    if (!window.confirm("Excluir esta mensagem do histórico?")) return;
    const keys = new Set(entry.sourceKeys ?? [logEntryKey(entry)]);
    removeLogs(candidate => keys.has(logEntryKey(candidate)));
  }

  function deleteActiveChat(): void {
    if (!activeContact || !messages.length) return;
    if (!window.confirm(`Apagar todo o chat com "${activeContact.label}"?`)) return;
    const keys = new Set(messages.map(logEntryKey));
    removeLogs(entry => keys.has(logEntryKey(entry)));
    if (activeContact.kind === "group") clearNativeGroupWhisperInput(api);
    setClosedKeys(current => uniqueNames([...current, activeContact.key]));
    setManualContacts(current => current.filter(contact => contact.key !== activeContact.key));
    setActiveKey(null);
    setError("");
  }

  function startConversation(event: React.FormEvent): void {
    event.preventDefault();
    const name = recipient.trim();
    if (!name || sameName(name, myself)) {
      setError("Escolha outro usuário para iniciar a conversa.");
      return;
    }
    const unit = roomUsers.find(candidate => sameName(candidate.name, name));
    const historyContact = historyContacts.find(candidate => candidate.kind === "user" && sameName(candidate.recipient, name));
    if (!unit && historyContact) {
      openContact(historyContact);
      return;
    }
    if (!unit) {
      setError("Esse usuário não está no quarto.");
      return;
    }
    const contact = createWhisperUserContact(unit.name);
    setManualContacts(current => current.some(item => item.key === contact.key) ? current : [contact, ...current]);
    setClosedKeys(current => current.filter(key => key !== contact.key));
    setActiveKey(contact.key);
    setRecipient("");
    setError("");
  }

  function sendWhisper(event: React.FormEvent): void {
    event.preventDefault();
    const message = draft.trim();
    if (!activeContact || !canSend || !message) return;

    if (activeContact.kind === "group") {
      const recipients = activeContact.members.filter(name => !sameName(name, myself));
      resetNativeGroupMembers(api, true);
      const sent = recipients.length > 0
        && recipients.every(name => api.send(new NativeGroupWhisperMemberComposer(name)))
        && withGroupWhisperRoute(activeContact.members, () => api.send(new RoomUnitWhisperComposer("group", message)));
      if (!sent) {
        setError("Não foi possível enviar. Entre em um quarto e tente novamente.");
        return;
      }
    } else if (!api.send(new RoomUnitWhisperComposer(activeContact.recipient, message))) {
      setError("Não foi possível enviar. Entre em um quarto e tente novamente.");
      return;
    }
    setDraft("");
    setError("");
  }

  function onDragMouseDown(event: React.MouseEvent): void {
    if ((event.target as HTMLElement).closest("button, input")) return;
    const rect = windowRef.current!.getBoundingClientRect();
    drag.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const move = (next: MouseEvent) => {
      const element = windowRef.current!;
      element.style.left = `${next.clientX - drag.current.x}px`;
      element.style.top = `${next.clientY - drag.current.y}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function onResizeMouseDown(event: React.MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const element = windowRef.current!;
    startSize.current = {
      width: element.offsetWidth,
      height: element.offsetHeight,
      x: event.clientX,
      y: event.clientY,
    };
    const move = (next: MouseEvent) => {
      element.style.width = `${Math.max(440, startSize.current.width + next.clientX - startSize.current.x)}px`;
      element.style.height = `${Math.max(360, startSize.current.height + next.clientY - startSize.current.y)}px`;
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div id="luminus-whisper-window" className="lm-float-window" ref={windowRef}>
      <div className="lw-header" onMouseDown={onDragMouseDown}>
        <span className="lw-title"><span className="lw-title-dot" />Histórico de chat</span>
        <div className="lw-header-actions">
          <span className="lw-count">{messages.length} mensagens</span>
          <button className="lw-close" onClick={onClose} aria-label="Fechar histórico de chat">✕</button>
        </div>
      </div>

      <div className="cw-new-row">
        <span className="cw-channel-label">Canal privado</span>
        <form className="cw-new-form" onSubmit={startConversation}>
          <input
            list="luminus-whisper-users"
            value={recipient}
            onChange={event => setRecipient(event.target.value)}
            placeholder="Conversar com..."
            aria-label="Nome do usuário"
          />
          <datalist id="luminus-whisper-users">
            {userOptions.map(name => <option key={name} value={name} />)}
          </datalist>
          <button type="submit">Abrir</button>
          <button type="button" onClick={clearNativeGroup}>Limpar grupo</button>
          <button type="button" onClick={closeOpenChats} disabled={!contacts.length}>Fechar chats</button>
        </form>
        <label className="cw-channel-label" title="Controla a fila local de sussurros repetidos">
          <input
            type="checkbox"
            checked={antispamEnabled}
            onChange={event => toggleAntispam(event.target.checked)}
            style={{ width: 13, height: 13, margin: "0 5px 0 0", accentColor: "#8ea2ff", verticalAlign: "-2px" }}
          />
          Antispam
        </label>
      </div>

      <div className="cw-tabs" role="tablist" aria-label="Conversas privadas">
        {contacts.map(contact => (
          <React.Fragment key={contact.key}>
            <button className={activeKey === contact.key ? "active" : ""} onClick={() => selectContact(contact)} role="tab">
              <span className={`cw-status${contact.kind === "group" || roomUsers.some(unit => sameName(unit.name, contact.recipient)) ? " online" : ""}`} />{contact.label}
              {unreadCounts[contact.key] ? <span style={UNREAD_BADGE_STYLE}>{unreadCounts[contact.key]}</span> : null}
            </button>
            <button
              type="button"
              onClick={() => closeContact(contact)}
              style={TAB_CLOSE_STYLE}
              title={`Fechar chat de ${contact.label}`}
              aria-label={`Fechar chat de ${contact.label}`}
            >
              ×
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="cw-thread-head">
        <div>
          <strong>{activeContact?.label ?? "Nenhuma conversa nesta sessão"}</strong>
          <span>{activeContact?.kind === "group" ? activeContact.members.join(", ") : activeContact ? (activeUnit ? "Conversa privada no quarto atual" : "Usuário fora do quarto") : "Inicie ou receba um sussurro para abrir o histórico"}</span>
        </div>
        <span style={THREAD_ACTIONS_STYLE}>
          {activeContact && messages.length > 0 && <button onClick={deleteActiveChat}>Apagar chat</button>}
          {activeContact?.kind === "user" && <button onClick={event => {
            if (handleCtrlUserClick(event, api, activeContact.recipient)) return;
            openUserProfile(api, activeContact.recipient);
          }}>Ver perfil</button>}
        </span>
      </div>

      <div className="cw-messages" ref={listRef} aria-live="polite">
        {loadingHistory && activeContact && messages.length === 0 && <div className="cw-empty"><span>Carregando histórico...</span></div>}
        {!loadingHistory && messages.length === 0 && (
          <div className="cw-empty">
            <span>Sem mensagens aqui.</span>
            <small>{activeContact ? `Envie o primeiro sussurro para ${activeContact.label}.` : "Abra uma conversa com alguém do quarto."}</small>
          </div>
        )}
        {days.map(day => (
          <React.Fragment key={day.key}>
            <div className="cw-day"><span>{fmtDay(day.ts)}</span></div>
            {day.entries.map((entry, index) => {
              const mine = sameName(entry.actor, myself);
              const avatar = avatarUrl(entry.figure);
              return (
                <div className={`cw-message${mine ? " mine" : ""}`} key={`${entry.ts}-${index}`}>
                  {!mine && <div className="cw-avatar">{avatar ? <img src={avatar} alt="" /> : entry.actor.slice(0, 1)}</div>}
                  <div className="cw-bubble">
                    <div className="cw-meta">
                      <button onClick={event => {
                        if (handleCtrlUserClick(event, api, entry.actor)) return;
                        openUserProfile(api, entry.actor);
                      }}>{entry.actor}</button>
                      <button
                        onClick={() => deleteMessage(entry)}
                        style={DELETE_MESSAGE_STYLE}
                        title="Excluir mensagem"
                        aria-label="Excluir mensagem"
                      >
                        ×
                      </button>
                      <time>{fmtTime(entry.ts)}</time>
                    </div>
                    <p>{entry.message}</p>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <form className="cw-composer" onSubmit={sendWhisper}>
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          maxLength={100}
          disabled={!canSend}
          placeholder={activeContact ? (canSend ? `Sussurrar para ${activeContact.label}` : `${activeContact.label} não está no quarto`) : "Selecione uma conversa para responder"}
          aria-label="Mensagem"
        />
        <button type="submit" disabled={!canSend || !draft.trim()} aria-label="Enviar sussurro">Enviar</button>
      </form>
      {error && <div className="cw-error" role="alert">{error}</div>}
      <div className="lw-resize" onMouseDown={onResizeMouseDown} />
    </div>
  );
}

function uniqueContacts(contacts: WhisperContact[]): WhisperContact[] {
  return contacts.filter((contact, index, all) =>
    all.findIndex(candidate => candidate.key === contact.key) === index
  );
}

function uniqueNames(names: string[]): string[] {
  return names.filter((name, index, all) =>
    all.findIndex(item => sameName(item, name)) === index
  );
}

function logEntryKey(entry: LogEntry): string {
  return [
    entry.ts,
    entry.type,
    entry.actor,
    entry.target ?? "",
    entry.message,
    entry.groupMembers?.join(",") ?? "",
  ].join("\u0000");
}

function groupClickMessages(entries: LogEntry[]): VisibleLogEntry[] {
  const grouped: VisibleLogEntry[] = [];

  for (const entry of entries) {
    const previous = grouped[grouped.length - 1];
    if (entry.type === "click" && previous?.type === "click" && sameName(previous.actor, entry.actor)) {
      const sourceKeys = [...(previous.sourceKeys ?? [logEntryKey(previous)]), logEntryKey(entry)];
      grouped[grouped.length - 1] = {
        ...entry,
        message: `${entry.actor} clicou em você (${sourceKeys.length}x)`,
        sourceKeys,
      };
      continue;
    }

    grouped.push(entry.type === "click"
      ? { ...entry, message: `${entry.actor} clicou em você`, sourceKeys: [logEntryKey(entry)] }
      : entry);
  }

  return grouped;
}
