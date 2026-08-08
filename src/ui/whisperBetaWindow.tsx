import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bot,
  Check,
  CheckCheck,
  ChevronUp,
  Copy,
  EllipsisVertical,
  Eraser,
  FolderArchive,
  MessageCirclePlus,
  MessagesSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  classifyRoomChatRole,
  parseChatColorTag,
  roomChatRoleLabel,
  type RoomChatRole,
} from "../chat/roomChatPresentation";
import {
  applyClampedPosition,
  applyClampedSize,
  fitElementInSafeBounds,
  getChatSafeBounds,
} from "./windowBounds";
import type { RoomUnitTyping } from "../messages/incoming/RoomUnitTypingParser";
import type { MessengerSearch } from "../messages/incoming/MessengerSearchParser";
import { HabboSearchComposer } from "../messages/outgoing/HabboSearchComposer";
import { RoomUnitChatComposer } from "../messages/outgoing/RoomUnitChatComposer";
import { RoomUnitWhisperComposer } from "../messages/outgoing/RoomUnitWhisperComposer";
import {
  getChatConversationViews,
  getChatThread,
  getChatListSnapshot,
  getChatThreadSnapshot,
  subscribeChatList,
  subscribeChatThread,
  ensureChatWorkspaceLoaded,
  setChatWindowContext,
  selectChatConversation,
  openDirectConversation,
  openGroupConversation,
  closeChatConversation,
  archiveChatConversation,
  pinChatConversation,
  renameChatConversation,
  markChatConversationRead,
  markChatConversationUnread,
  removeChatConversationState,
  setChatGeometry,
  isLocalChatMessage,
  isUnverifiedChatMessage,
  type ChatConversationView,
} from "../chat/chatWorkspaceStore";
import {
  rebuildThreadWindow,
  tryAppendThreadWindow,
  type ThreadWindowCache,
} from "../chat/chatThreadWindow";
import { removeLogs, type LogEntry } from "../logs/logStore";
import { sendNativeGroupWhisper } from "../chat/nativeGroupMount";
import { clearNativeGroupWhisperInput } from "../chat/nativeGroupWhisperReset";
import {
  isWhisperAntispamEnabled,
  setWhisperAntispamEnabled,
} from "../chat/whisperQueue";
import {
  logEntryKey,
  type VisibleLogEntry,
} from "../chat/chatRenderWindow";
import type { LuminusApi } from "../ws/api";
import {
  acquireFigureImagingSlot,
  isFigureImagingCached,
  markFigureImagingError,
  markFigureImagingReady,
  resolveFigureImaging,
} from "./figureImagingCache";
import { openUserProfile } from "./profileLinks";
import { AvatarScrollRootContext } from "./shadcn/scrollArea";
import {
  getActiveRoomChatIdSnapshot,
  getActiveRoomChatSession,
  getRoomChatSessionSnapshot,
  subscribeRoomChatSessions,
  type RoomChatMessage,
  type RoomChatSession,
} from "../chat/roomChatSessionStore";
import {
  Message,
  MessageAvatar as MessageAvatarSlot,
  MessageContent,
  MessageGroup,
} from "./shadcn/message";
import {
  Bubble,
  BubbleContent,
} from "./shadcn/bubble";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "./shadcn/messageScroller";
import {
  ChatContextMenu,
  ChatDropdownMenu,
  type ChatMenuAction,
} from "./shadcn/menus";
import { ChatScrollArea } from "./shadcn/scrollArea";

interface Props {
  api: LuminusApi;
  open: boolean;
  onClose: () => void;
}

type ListFilter = "all" | "unread" | "groups";
type NewChatMode = "person" | "group";

type ContextMenuTarget =
  | { kind: "chat"; key: string }
  | { kind: "message"; key: string; entry: VisibleLogEntry };

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void;
}

interface SearchResult {
  id: number;
  name: string;
  source: "room" | "history" | "habblet";
  figure?: string;
}

/** Initial / page-in size. Smaller than before: stress showed ~100 rich rows already costly. */
const PAGE_SIZE = 40;
const TYPING_TTL_MS = 6000;
const ROOM_PRESENCE_THROTTLE_MS = 200;
const avatarVisibilityCallbacks = new WeakMap<Element, () => void>();
/** One IntersectionObserver per scroll root (null = window viewport). */
const avatarVisibilityObservers = new Map<Element | "window", IntersectionObserver>();
/**
 * Nova conversa — progressive room list (no hard total cap).
 * Mount a page at a time; prefetch the next page before rows enter the viewport.
 */
const NEW_CHAT_ROOM_PAGE = 36;
/** Distance from bottom (px) that triggers loading the next page early. */
const NEW_CHAT_PREFETCH_PX = 320;

/** Grow freely when loading older history — only clamp to available total. */
function clampVisibleCount(count: number, total: number): number {
  return Math.min(total, Math.max(0, count));
}

export function WhisperBetaWindow({ api, open, onClose }: Props) {
  const listSnap = React.useSyncExternalStore(
    subscribeChatList,
    getChatListSnapshot,
    getChatListSnapshot,
  );
  const subscribeVisibleRoomChat = React.useCallback(
    (listener: () => void) => open ? subscribeRoomChatSessions(listener) : () => {},
    [open],
  );
  const activeRoomId = React.useSyncExternalStore(
    subscribeVisibleRoomChat,
    getActiveRoomChatIdSnapshot,
    getActiveRoomChatIdSnapshot,
  );
  const windowRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ x: 0, y: 0 });
  const resizeRef = React.useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<ListFilter>("all");
  const [showArchived, setShowArchived] = React.useState(false);
  const [compactPane, setCompactPane] = React.useState<"list" | "thread">("list");
  const [selectedRoomId, setSelectedRoomId] = React.useState<number | null>(null);
  const draftsRef = React.useRef<Record<string, string>>({});
  const [error, setError] = React.useState("");
  const [menu, setMenu] = React.useState<ContextMenuTarget | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [newChatOpen, setNewChatOpen] = React.useState(false);
  const [renameKey, setRenameKey] = React.useState<string | null>(null);
  const [membersKey, setMembersKey] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [roomVersion, setRoomVersion] = React.useState(0);
  const [typing, setTyping] = React.useState<Record<string, number>>({});
  const [antispam, setAntispam] = React.useState(isWhisperAntispamEnabled);

  const myself = api.myself?.username ?? "";
  const conversations = React.useMemo(
    () => getChatConversationViews(),
    [listSnap.listRevision],
  );
  const activeRoomChat = activeRoomId != null && activeRoomId === selectedRoomId;
  const active = conversations.find(item => item.key === listSnap.selectedKey) ?? null;
  const roomUsers = React.useMemo(
    () => open ? [...api.room.units.values()]
      .filter(unit => unit.type === 1)
      .sort((a, b) => a.name.localeCompare(b.name)) : [],
    [api, open, roomVersion],
  );

  React.useEffect(() => {
    if (open) void ensureChatWorkspaceLoaded();
    setChatWindowContext(open, listSnap.selectedKey);
    if (!open) {
      setMenu(null);
      setNewChatOpen(false);
    }
  }, [open, listSnap.selectedKey]);

  // Keep Chat inside the stage: top flush (0), bottom just above the toolbar.
  React.useEffect(() => {
    if (!open || !windowRef.current) return;
    const safe = getChatSafeBounds();
    fitElementInSafeBounds(windowRef.current, {
      minWidth: Math.min(680, safe.width),
      minHeight: Math.min(420, safe.height),
      forceHeight: true,
      bounds: safe,
    });
    const rect = windowRef.current.getBoundingClientRect();
    setChatGeometry({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let presenceTimer = 0;
    let presencePending = false;
    const bumpRoom = () => {
      // Presence packets are extremely chatty in full rooms; throttle React work.
      if (presenceTimer) {
        presencePending = true;
        return;
      }
      setRoomVersion(version => version + 1);
      setTyping(current => {
        const present = new Set(
          [...api.room.units.values()]
            .filter(unit => unit.type === 1)
            .map(unit => normalizeName(unit.name)),
        );
        return Object.fromEntries(Object.entries(current).filter(([name]) => present.has(name)));
      });
      presenceTimer = window.setTimeout(() => {
        presenceTimer = 0;
        if (!presencePending) return;
        presencePending = false;
        bumpRoom();
      }, ROOM_PRESENCE_THROTTLE_MS);
    };
    const clearTyping = () => {
      setTyping({});
      bumpRoom();
    };
    const unsubs = [
      api.onIncoming(1717, ({ packet }) => {
        const data = packet.parsed as RoomUnitTyping | undefined;
        if (!data) return;
        const unit = api.room.units.get(data.unitId);
        if (!unit?.name) return;
        const key = normalizeName(unit.name);
        setTyping(current => {
          const next = { ...current };
          if (data.isTyping) next[key] = Date.now() + TYPING_TTL_MS;
          else delete next[key];
          return next;
        });
      }),
      api.onIncoming(374, bumpRoom),
      api.onIncoming(2661, bumpRoom),
      api.onIncoming(2031, clearTyping),
    ];
    return () => {
      if (presenceTimer) window.clearTimeout(presenceTimer);
      unsubs.forEach(unsub => unsub());
    };
  }, [api, open]);

  React.useEffect(() => {
    if (!open || !Object.keys(typing).length) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTyping(current => {
        const next = Object.fromEntries(
          Object.entries(current).filter(([, expiresAt]) => expiresAt > now),
        );
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, Object.keys(typing).join("\u0000")]);

  React.useEffect(() => {
    setError("");
    if (listSnap.selectedKey) setCompactPane("thread");
  }, [listSnap.selectedKey]);

  React.useEffect(() => {
    if (selectedRoomId != null && activeRoomId != null && selectedRoomId !== activeRoomId) {
      setSelectedRoomId(activeRoomId);
    }
  }, [activeRoomId, selectedRoomId]);

  if (!open) return null;

  const activeUnit = active?.kind === "user"
    ? roomUsers.find(unit => sameName(unit.name, active.recipient))
    : undefined;
  const presentGroupMembers = active?.kind === "group"
    ? active.members.filter(name => !sameName(name, myself) && roomUsers.some(unit => sameName(unit.name, name)))
    : [];
  const canSend = Boolean(
    active && (
      (active.kind === "user" && activeUnit)
      || (active.kind === "group" && presentGroupMembers.length)
    ),
  );
  const contextConversation = menu?.kind === "chat"
    ? conversations.find(item => item.key === menu.key)
    : undefined;
  const activeTyping = active ? typingLabel(active, typing) : "";
  const rows = conversations
    .filter(item => showArchived ? item.visibility === "archived" : item.visibility === "open")
    .filter(item => filter === "all"
      || (filter === "unread" && (item.unreadCount > 0 || item.manualUnread))
      || (filter === "groups" && item.kind === "group"))
    .filter(item => matchesConversation(item, query))
    .sort(compareConversations);

  function chooseConversation(key: string): void {
    setSelectedRoomId(null);
    selectChatConversation(key);
    setCompactPane("thread");
    setMenu(null);
  }

  function chooseRoomConversation(roomId: number): void {
    setSelectedRoomId(roomId);
    selectChatConversation(null);
    setCompactPane("thread");
    setMenu(null);
  }

  function toggleAntispam(): void {
    const enabled = !antispam;
    setWhisperAntispamEnabled(enabled);
    setAntispam(enabled);
  }

  function sendMessage(message: string): boolean {
    if (!active || !canSend) return false;
    const sent = active.kind === "group"
      ? sendNativeGroupWhisper(api, active.members, myself, message)
      : api.send(new RoomUnitWhisperComposer(active.recipient, message));
    if (!sent) {
      setError("Não foi possível enviar a mensagem.");
      return false;
    }
    setError("");
    return true;
  }

  function deleteMessage(entry: VisibleLogEntry): void {
    setConfirm({
      title: "Excluir mensagem",
      body: "Esta mensagem será removida apenas do seu histórico local.",
      confirmLabel: "Excluir",
      danger: true,
      action: () => {
        const keys = new Set(entry.sourceKeys ?? [logEntryKey(entry)]);
        removeLogs(candidate => keys.has(logEntryKey(candidate)));
      },
    });
  }

  function clearConversation(conversation: ChatConversationView): void {
    setConfirm({
      title: "Limpar mensagens",
      body: `Apagar todas as mensagens de ${conversation.displayName} e manter a conversa aberta?`,
      confirmLabel: "Limpar",
      danger: true,
      action: () => removeConversationLogs(conversation),
    });
  }

  function deleteConversation(conversation: ChatConversationView): void {
    setConfirm({
      title: "Excluir conversa",
      body: `Apagar o histórico e remover ${conversation.displayName} da sua lista?`,
      confirmLabel: "Excluir conversa",
      danger: true,
      action: () => {
        removeConversationLogs(conversation);
        removeChatConversationState(conversation.key);
        if (conversation.kind === "group") clearNativeGroupWhisperInput(api);
      },
    });
  }

  function removeConversationLogs(conversation: ChatConversationView): void {
    const keys = new Set(getChatThread(conversation.key).map(logEntryKey));
    removeLogs(entry => keys.has(logEntryKey(entry)));
  }

  function openRename(conversation: ChatConversationView): void {
    setRenameKey(conversation.key);
    setRenameValue(conversation.customName ?? conversation.label);
    setMenu(null);
  }

  function saveRename(event: React.FormEvent): void {
    event.preventDefault();
    if (renameKey) renameChatConversation(renameKey, renameValue);
    setRenameKey(null);
  }

  function conversationActions(conversation: ChatConversationView): ChatMenuAction[] {
    const actions: ChatMenuAction[] = [];
    if (conversation.kind === "user") {
      actions.push({
        id: "profile",
        icon: <UserRound />,
        label: "Abrir perfil",
        onSelect: () => openUserProfile(api, conversation.recipient),
      });
    }
    actions.push(
      {
        id: "read",
        icon: conversation.unreadCount || conversation.manualUnread ? <CheckCheck /> : <Check />,
        label: conversation.unreadCount || conversation.manualUnread ? "Marcar como lida" : "Marcar como não lida",
        onSelect: () => conversation.unreadCount || conversation.manualUnread
          ? markChatConversationRead(conversation.key)
          : markChatConversationUnread(conversation.key),
      },
      {
        id: "pin",
        icon: conversation.pinned ? <PinOff /> : <Pin />,
        label: conversation.pinned ? "Desafixar" : "Fixar",
        onSelect: () => pinChatConversation(conversation.key, !conversation.pinned),
      },
      {
        id: "archive",
        icon: conversation.visibility === "archived" ? <ArchiveRestore /> : <Archive />,
        label: conversation.visibility === "archived" ? "Desarquivar" : "Arquivar",
        onSelect: () => archiveChatConversation(conversation.key, conversation.visibility !== "archived"),
      },
    );
    if (conversation.kind === "group") {
      actions.push(
        {
          id: "rename",
          icon: <UsersRound />,
          label: "Renomear grupo",
          onSelect: () => openRename(conversation),
        },
        {
          id: "members",
          icon: <UsersRound />,
          label: "Ver membros",
          onSelect: () => setMembersKey(conversation.key),
        },
        {
          id: "clear-native-group",
          icon: <Eraser />,
          label: "Limpar grupo nativo",
          onSelect: () => clearNativeGroupWhisperInput(api),
        },
      );
    }
    actions.push(
      {
        id: "close",
        icon: <X />,
        label: "Fechar conversa",
        onSelect: () => closeChatConversation(conversation.key),
      },
      {
        id: "clear",
        icon: <Eraser />,
        label: "Limpar mensagens",
        separatorBefore: true,
        onSelect: () => clearConversation(conversation),
      },
      {
        id: "delete",
        icon: <Trash2 />,
        label: "Excluir conversa",
        danger: true,
        onSelect: () => deleteConversation(conversation),
      },
    );
    return actions;
  }

  function messageActions(entry: VisibleLogEntry): ChatMenuAction[] {
    const actions: ChatMenuAction[] = [{
      id: "copy",
      icon: <Copy />,
      label: "Copiar mensagem",
      onSelect: () => void copyText(entry.message),
    }];
    if (active && !isLocalChatMessage(entry, active)) {
      actions.push({
        id: "profile",
        icon: <UserRound />,
        label: "Abrir perfil do autor",
        onSelect: () => openUserProfile(api, entry.actor),
      });
    }
    actions.push({
      id: "delete",
      icon: <Trash2 />,
      label: "Excluir mensagem",
      danger: true,
      separatorBefore: true,
      onSelect: () => deleteMessage(entry),
    });
    return actions;
  }

  function onDragMouseDown(event: React.MouseEvent): void {
    if ((event.target as HTMLElement).closest("button, input, textarea")) return;
    const element = windowRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    dragRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const move = (next: MouseEvent) => {
      // Chat: top flush with stage; never into toolbar.
      applyClampedPosition(
        element,
        next.clientX - dragRef.current.x,
        next.clientY - dragRef.current.y,
        { bounds: getChatSafeBounds() },
      );
    };
    const up = () => {
      const rectNow = element.getBoundingClientRect();
      setChatGeometry({ left: rectNow.left, top: rectNow.top, width: rectNow.width, height: rectNow.height });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function onResizeMouseDown(event: React.MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const element = windowRef.current;
    if (!element) return;
    resizeRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
    const safe = getChatSafeBounds();
    // No artificial horizontal cap — only the safe stage width (full width OK).
    const minW = Math.min(680, safe.width);
    const minH = Math.min(420, safe.height);
    const move = (next: MouseEvent) => {
      applyClampedSize(
        element,
        resizeRef.current.width + next.clientX - resizeRef.current.x,
        resizeRef.current.height + next.clientY - resizeRef.current.y,
        { minWidth: minW, minHeight: minH, bounds: safe },
      );
    };
    const up = () => {
      setChatGeometry({
        left: element.getBoundingClientRect().left,
        top: element.getBoundingClientRect().top,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const geometry = clampGeometry(listSnap.geometry);
  const style: React.CSSProperties = {
    top: geometry.top,
    left: geometry.left ?? undefined,
    right: geometry.left == null ? 72 : "auto",
    width: geometry.width,
    height: geometry.height,
  };

  return (
    <div
      id="luminus-chat-beta"
      className={`lm-float-window cb-window is-${compactPane}`}
      ref={windowRef}
      style={style}
    >
      <header className="cb-titlebar" onMouseDown={onDragMouseDown}>
        <div className="cb-brand">
          <span className="cb-brand-mark"><MessageCirclePlus aria-hidden="true" /></span>
          <span><strong>Chat</strong></span>
        </div>
        <div className="cb-title-actions">
          <button
            type="button"
            className={antispam ? "is-active" : ""}
            title={`Antispam de sussurros: ${antispam ? "ativado" : "desativado"}. Não burla o antispam do jogo; apenas envia sussurros digitados rapidamente no intervalo aceito para evitar um mute de 30 segundos.`}
            aria-pressed={antispam}
            onClick={toggleAntispam}
          >
            <ShieldCheck aria-hidden="true" />
          </button>
          <button type="button" title="Fechar Chat Beta" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="cb-layout">
        <aside className="cb-sidebar">
          <div className="cb-sidebar-tools">
            <label className="cb-search">
              <Search aria-hidden="true" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar conversas"
                aria-label="Buscar conversas"
              />
            </label>
            <button type="button" className="cb-icon-primary" title="Nova conversa" onClick={() => setNewChatOpen(true)}>
              <MessageCirclePlus aria-hidden="true" />
            </button>
          </div>

          <ToggleGroup.Root
            className="cb-filters"
            type="single"
            value={filter}
            aria-label="Filtrar conversas"
            onValueChange={value => {
              if (value) setFilter(value as ListFilter);
            }}
          >
            {(["all", "unread", "groups"] as const).map(value => (
              <ToggleGroup.Item
                key={value}
                value={value}
              >
                {value === "all" ? "Todas" : value === "unread" ? "Não lidas" : "Grupos"}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          <ChatScrollArea className="cb-contact-scroll" viewportClassName="cb-contact-list">
            <ChatContextMenu
              actions={contextConversation ? conversationActions(contextConversation) : []}
              onOpenChange={isOpen => {
                if (!isOpen) setMenu(null);
              }}
            >
              <div
                className="cb-contact-flow"
                onContextMenu={event => {
                  const row = (event.target as HTMLElement).closest<HTMLElement>("[data-chat-key]");
                  const key = row?.dataset.chatKey;
                  if (!key) {
                    event.preventDefault();
                    setMenu(null);
                    return;
                  }
                  setMenu({ kind: "chat", key });
                }}
              >
            <RoomChatContact
              active={activeRoomChat}
              onChoose={chooseRoomConversation}
            />

            {showArchived ? (
              <button type="button" className="cb-archive-row is-back" onClick={() => setShowArchived(false)}>
                <ArrowLeft aria-hidden="true" />
                <span><strong>Arquivadas</strong><small>Voltar para conversas</small></span>
              </button>
            ) : (
              <button type="button" className="cb-archive-row" onClick={() => setShowArchived(true)}>
                <FolderArchive aria-hidden="true" />
                <span><strong>Arquivadas</strong></span>
              </button>
            )}

            {listSnap.loading && rows.length === 0 && activeRoomId == null && (
              <div className="cb-list-empty">Carregando conversas...</div>
            )}
            {!listSnap.loading && rows.length === 0 && activeRoomId == null && (
              <div className="cb-list-empty">
                {query ? "Nenhuma conversa encontrada." : showArchived ? "Nenhuma conversa arquivada." : "Nenhuma conversa aberta."}
              </div>
            )}
            {rows.map(conversation => {
              const typingText = typingLabel(conversation, typing);
              const preview = typingText || conversationPreview(
                conversation,
                conversation.key === active?.key ? undefined : draftsRef.current[conversation.key],
              );
              return (
                <div
                  className={`cb-contact${conversation.key === active?.key ? " is-active" : ""}`}
                  data-chat-key={conversation.key}
                  key={conversation.key}
                >
                  <button type="button" className="cb-contact-main" onClick={() => chooseConversation(conversation.key)}>
                    <ConversationAvatar api={api} conversation={conversation} roomUsers={roomUsers} />
                    <span className="cb-contact-copy">
                      <span className="cb-contact-line">
                        <strong>{conversation.displayName}</strong>
                        <time>{formatListTime(conversation.lastWhisper?.ts ?? conversation.openedAt)}</time>
                      </span>
                      <span className="cb-contact-line is-preview">
                        <span className={typingText ? "is-typing" : ""}>{preview}</span>
                        <span className="cb-contact-indicators">
                          {conversation.pinned && <Pin aria-label="Fixada" />}
                          {conversation.unreadCount > 0 && <b>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</b>}
                          {!conversation.unreadCount && conversation.manualUnread && <i aria-label="Marcada como não lida" />}
                        </span>
                      </span>
                    </span>
                  </button>
                  <ChatDropdownMenu actions={conversationActions(conversation)}>
                    <button
                      type="button"
                      className="cb-row-menu"
                      title={`Ações de ${conversation.displayName}`}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                  </ChatDropdownMenu>
                </div>
              );
            })}
              </div>
            </ChatContextMenu>
          </ChatScrollArea>
        </aside>

        <main className="cb-thread">
          {activeRoomChat && selectedRoomId != null ? (
            <SubscribedRoomChatThread
              key={selectedRoomId}
              api={api}
              roomId={selectedRoomId}
              onBack={() => setCompactPane("list")}
            />
          ) : !active ? (
            <div className="cb-thread-empty">
              <MessageCirclePlus aria-hidden="true" />
              <strong>Selecione uma conversa</strong>
              <span>Abra um chat existente ou inicie uma nova conversa.</span>
            </div>
          ) : (
            <WhisperThreadPane
              api={api}
              conversation={active}
              myself={myself}
              roomUsers={roomUsers}
              activeTyping={activeTyping}
              canSend={canSend}
              presentGroupMembers={presentGroupMembers.length}
              draft={draftsRef.current[active.key] ?? ""}
              error={error}
              menu={menu}
              onMenuChange={setMenu}
              onBack={() => setCompactPane("list")}
              conversationActions={conversationActions(active)}
              messageActions={messageActions}
              onDraftChange={value => {
                if (value) draftsRef.current[active.key] = value;
                else delete draftsRef.current[active.key];
              }}
              onSend={sendMessage}
              onCloseConversation={() => closeChatConversation(active.key)}
            />
          )}
        </main>
      </div>

      <div className="cb-resize" onMouseDown={onResizeMouseDown} />

      {newChatOpen && (
        <NewChatDialog
          api={api}
          container={windowRef.current}
          myself={myself}
          roomUsers={roomUsers}
          conversations={conversations}
          onClose={() => setNewChatOpen(false)}
          onOpenPerson={(name, figure) => {
            openDirectConversation(name, figure);
            setNewChatOpen(false);
          }}
          onOpenGroup={(members, name) => {
            openGroupConversation([myself, ...members], name);
            setNewChatOpen(false);
          }}
        />
      )}

      <Dialog.Root open={Boolean(renameKey)} onOpenChange={isOpen => !isOpen && setRenameKey(null)}>
        <Dialog.Portal container={windowRef.current ?? undefined}>
          <Dialog.Overlay className="cb-modal-backdrop" />
          <Dialog.Content asChild aria-describedby={undefined}>
            <form className="cb-dialog cb-rename-dialog" onSubmit={saveRename}>
              <div className="cb-dialog-head">
                <Dialog.Title asChild><strong>Renomear grupo</strong></Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" title="Fechar"><X /></button>
                </Dialog.Close>
              </div>
              <label>
                Nome do grupo
                <input autoFocus value={renameValue} maxLength={60} onChange={event => setRenameValue(event.target.value)} />
              </label>
              <div className="cb-dialog-actions">
                <Dialog.Close asChild><button type="button">Cancelar</button></Dialog.Close>
                <button type="submit" className="is-primary">Salvar</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {(() => {
        const conversation = conversations.find(item => item.key === membersKey);
        if (!conversation || conversation.kind !== "group") return null;
        return (
          <Dialog.Root open onOpenChange={isOpen => !isOpen && setMembersKey(null)}>
            <Dialog.Portal container={windowRef.current ?? undefined}>
              <Dialog.Overlay className="cb-modal-backdrop" />
              <Dialog.Content className="cb-dialog cb-members-dialog" aria-describedby={undefined}>
                <div className="cb-dialog-head">
                  <Dialog.Title asChild><strong>Membros de {conversation.displayName}</strong></Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" title="Fechar"><X /></button>
                  </Dialog.Close>
                </div>
                <ChatScrollArea className="cb-member-scroll" viewportClassName="cb-member-list">
                  {conversation.members.map(name => {
                    const unit = roomUsers.find(item => sameName(item.name, name));
                    return (
                      <button type="button" key={name} onClick={() => !sameName(name, myself) && openUserProfile(api, name)}>
                        <Avatar api={api} figure={unit?.figure} name={name} />
                        <span><strong>{name}</strong><small>{sameName(name, myself) ? "Você" : unit ? "No quarto" : "Fora do quarto"}</small></span>
                      </button>
                    );
                  })}
                </ChatScrollArea>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        );
      })()}

      <AlertDialog.Root open={Boolean(confirm)} onOpenChange={isOpen => !isOpen && setConfirm(null)}>
        <AlertDialog.Portal container={windowRef.current ?? undefined}>
          <AlertDialog.Overlay className="cb-modal-backdrop" />
          {confirm && (
            <AlertDialog.Content className="cb-dialog cb-confirm-dialog">
              <div className="cb-dialog-head">
                <AlertDialog.Title asChild><strong>{confirm.title}</strong></AlertDialog.Title>
              </div>
              <AlertDialog.Description>{confirm.body}</AlertDialog.Description>
              <div className="cb-dialog-actions">
                <AlertDialog.Cancel asChild><button type="button">Cancelar</button></AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    type="button"
                    className={confirm.danger ? "is-danger" : "is-primary"}
                    onClick={confirm.action}
                  >
                    {confirm.confirmLabel}
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          )}
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

/**
 * Isolated whisper thread: owns threadRevision subscription so live appends do not
 * re-render the conversation list shell. Uses incremental window cache when possible.
 */
const WhisperThreadPane = React.memo(function WhisperThreadPane({
  api,
  conversation,
  myself,
  roomUsers,
  activeTyping,
  canSend,
  presentGroupMembers,
  draft,
  error,
  menu,
  onMenuChange,
  onBack,
  conversationActions,
  messageActions,
  onDraftChange,
  onSend,
  onCloseConversation,
}: {
  api: LuminusApi;
  conversation: ChatConversationView;
  myself: string;
  roomUsers: ReturnType<typeof roomUsersType>;
  activeTyping: string;
  canSend: boolean;
  presentGroupMembers: number;
  draft: string;
  error: string;
  menu: ContextMenuTarget | null;
  onMenuChange: (menu: ContextMenuTarget | null) => void;
  onBack: () => void;
  conversationActions: ChatMenuAction[];
  messageActions: (entry: VisibleLogEntry) => ChatMenuAction[];
  onDraftChange: (value: string) => void;
  onSend: (message: string) => boolean;
  onCloseConversation: () => void;
}) {
  const threadSnap = React.useSyncExternalStore(
    subscribeChatThread,
    getChatThreadSnapshot,
    getChatThreadSnapshot,
  );
  // Keep hotel/input responsive while a whisper stream is hot — UI may lag one tick.
  const deferredThreadRevision = React.useDeferredValue(threadSnap.threadRevision);
  const deferredThreadLength = React.useDeferredValue(threadSnap.threadLength);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const cacheRef = React.useRef<ThreadWindowCache | null>(null);
  const unverifiedCacheRef = React.useRef({ key: "", len: 0, value: false });

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSearchOpen(false);
    setQuery("");
    cacheRef.current = null;
  }, [conversation.key]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    cacheRef.current = null;
  }, [query]);

  const activeUnit = conversation.kind === "user"
    ? roomUsers.find(unit => sameName(unit.name, conversation.recipient))
    : undefined;

  const thread = getChatThread(conversation.key);
  const liveThreadLen = threadSnap.selectedKey === conversation.key
    ? deferredThreadLength
    : thread.length;
  const wanted = React.useMemo(() => normalizeName(query), [query]);
  const searchActive = wanted.length > 0;

  const searchThread = React.useMemo(() => {
    if (!searchActive) return null;
    const live = getChatThread(conversation.key);
    return live.filter(entry =>
      normalizeName(entry.actor).includes(wanted)
      || normalizeName(entry.message).includes(wanted)
      || (entry.target ? normalizeName(entry.target).includes(wanted) : false)
    );
  }, [conversation.key, deferredThreadRevision, searchActive, wanted]);

  const activeThreadLen = searchActive
    ? (searchThread?.length ?? 0)
    : liveThreadLen;
  const effectiveVisible = clampVisibleCount(visibleCount, activeThreadLen);

  const windowModel = React.useMemo(() => {
    const liveThread = searchActive
      ? (searchThread ?? [])
      : getChatThread(conversation.key);
    const prev = cacheRef.current;
    const appended = !searchActive && prev
      ? tryAppendThreadWindow(prev, liveThread, effectiveVisible, conversation)
      : null;
    const next = appended ?? rebuildThreadWindow(liveThread, effectiveVisible, conversation);
    cacheRef.current = next;
    return next;
  }, [
    conversation.key,
    conversation.kind,
    conversation.recipient,
    deferredThreadRevision,
    effectiveVisible,
    searchActive,
    searchThread,
  ]);

  const hasUnverifiedHistory = React.useMemo(() => {
    const liveThread = getChatThread(conversation.key);
    const cache = unverifiedCacheRef.current;
    if (cache.key !== conversation.key) {
      cache.key = conversation.key;
      cache.len = 0;
      cache.value = false;
    }
    if (cache.value) return true;
    if (liveThread.length <= cache.len) return cache.value;
    const from = cache.len === 0 ? 0 : cache.len;
    const headScan = cache.len === 0 ? Math.min(40, liveThread.length) : 0;
    for (let i = 0; i < headScan; i++) {
      if (isUnverifiedChatMessage(liveThread[i])) {
        cache.value = true;
        cache.len = liveThread.length;
        return true;
      }
    }
    for (let i = Math.max(from, headScan); i < liveThread.length; i++) {
      if (isUnverifiedChatMessage(liveThread[i])) {
        cache.value = true;
        cache.len = liveThread.length;
        return true;
      }
    }
    cache.len = liveThread.length;
    return false;
  }, [conversation.key, deferredThreadRevision]);

  const groupedThread = windowModel.annotated;
  const messageGroups = windowModel.groups;

  return (
    <>
      <header className="cb-thread-header">
        <button type="button" className="cb-mobile-back" title="Voltar" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cb-thread-person"
          onClick={() => conversation.kind === "user" && openUserProfile(api, conversation.recipient)}
          disabled={conversation.kind !== "user"}
        >
          <ConversationAvatar api={api} conversation={conversation} roomUsers={roomUsers} eager />
          <span>
            <strong>{conversation.displayName}</strong>
            <small className={activeTyping ? "is-typing" : hasUnverifiedHistory ? "is-unverified" : ""}>
              {activeTyping
                || (hasUnverifiedHistory
                  ? "Histórico antigo não verificado"
                  : conversationStatus(conversation, activeUnit != null, presentGroupMembers, myself))}
            </small>
          </span>
        </button>
        <div className="cb-thread-actions">
          <button
            type="button"
            className={searchOpen ? "is-active" : ""}
            title={searchOpen ? "Fechar pesquisa" : "Pesquisar na conversa"}
            aria-pressed={searchOpen}
            onClick={() => {
              setSearchOpen(open => {
                if (open) setQuery("");
                return !open;
              });
            }}
          >
            <Search aria-hidden="true" />
          </button>
          {conversation.kind === "user" && (
            <button type="button" title="Abrir perfil" onClick={() => openUserProfile(api, conversation.recipient)}>
              <UserRound aria-hidden="true" />
            </button>
          )}
          <ChatDropdownMenu actions={conversationActions}>
            <button type="button" title="Ações da conversa">
              <EllipsisVertical aria-hidden="true" />
            </button>
          </ChatDropdownMenu>
          <button type="button" title="Fechar conversa" onClick={onCloseConversation}>
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && (
        <label className="cb-thread-search">
          <Search aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar nesta conversa…"
            aria-label="Buscar mensagens nesta conversa"
          />
          {query && (
            <small>
              {activeThreadLen}
            </small>
          )}
          {query && (
            <button
              type="button"
              className="cb-thread-search-clear"
              title="Limpar"
              onClick={() => setQuery("")}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </label>
      )}

      <MessageScrollerProvider
        autoScroll={!searchActive}
        defaultScrollPosition="end"
        scrollEdgeThreshold={16}
      >
        <MessageScrollerReset resetKey={`${conversation.key}:${wanted}`} />
        <MessageScroller className="cb-messages">
          <MessageScrollerViewport
            resumeAutoScrollAtEnd={!searchActive}
            onScroll={event => {
              const element = event.currentTarget;
              if (element.scrollTop > 24 || effectiveVisible >= activeThreadLen) return;
              setVisibleCount(count => clampVisibleCount(count + PAGE_SIZE, activeThreadLen));
            }}
          >
            <ChatContextMenu
              actions={menu?.kind === "message" ? messageActions(menu.entry) : []}
              onOpenChange={isOpen => {
                if (!isOpen) onMenuChange(null);
              }}
            >
              <MessageScrollerContent
                className="cb-message-flow"
                onContextMenu={event => {
                  const row = (event.target as HTMLElement).closest<HTMLElement>("[data-message-index]");
                  const index = Number(row?.dataset.messageIndex);
                  const entry = Number.isInteger(index) ? groupedThread[index]?.entry : undefined;
                  if (!entry) {
                    event.preventDefault();
                    onMenuChange(null);
                    return;
                  }
                  onMenuChange({ kind: "message", key: conversation.key, entry });
                }}
              >
                {effectiveVisible < activeThreadLen && (
                  <MessageScrollerItem>
                    <button
                      type="button"
                      className="cb-load-older"
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        setVisibleCount(count => clampVisibleCount(count + PAGE_SIZE, activeThreadLen));
                      }}
                    >
                      <ChevronUp aria-hidden="true" /> Carregar anteriores
                      {activeThreadLen - effectiveVisible > 0 && (
                        <small> ({Math.min(PAGE_SIZE, activeThreadLen - effectiveVisible)})</small>
                      )}
                    </button>
                  </MessageScrollerItem>
                )}
                {searchActive && (
                  <MessageScrollerItem>
                    <div className="cb-room-search-summary">
                      {activeThreadLen
                        ? `${activeThreadLen} ${activeThreadLen === 1 ? "mensagem encontrada" : "mensagens encontradas"}`
                        : "Nenhuma mensagem encontrada"}
                    </div>
                  </MessageScrollerItem>
                )}
                {hasUnverifiedHistory && (
                  <MessageScrollerItem>
                    <div className="cb-legacy-notice" role="note">
                      <TriangleAlert aria-hidden="true" />
                      <span>
                        <strong>Histórico antigo não verificado</strong>
                        <small>Alguns registros anteriores ao Chat Beta podem ter conversa, remetente ou destinatário incorretos.</small>
                      </span>
                    </div>
                  </MessageScrollerItem>
                )}
                {groupedThread.length === 0 && (
                  <MessageScrollerItem>
                    <div className="cb-message-empty">Nenhuma mensagem nesta conversa.</div>
                  </MessageScrollerItem>
                )}
                {messageGroups.map(group => {
                  const first = group.items[0];
                  return (
                    <MessageScrollerItem
                      key={`${logEntryKey(first.entry)}-${first.index}`}
                      messageId={`${first.entry.ts}:${first.index}`}
                    >
                      {group.dayChanged && <div className="cb-day-separator">{formatDay(first.entry.ts)}</div>}
                      {first.entry.type === "click" ? (
                        <button
                          type="button"
                          className="cb-click-event"
                          data-message-index={first.index}
                          onClick={() => openUserProfile(api, first.entry.actor)}
                        >
                          {first.entry.message}
                        </button>
                      ) : (
                        <MessageGroup>
                          {group.items.map(item => {
                            const mine = isLocalChatMessage(item.entry, conversation);
                            return (
                              <ChatMessageRow
                                key={`${logEntryKey(item.entry)}-${item.index}`}
                                api={api}
                                actor={item.entry.actor}
                                figure={item.entry.figure}
                                message={item.entry.message}
                                ts={item.entry.ts}
                                mine={mine}
                                start={item.start}
                                end={item.end}
                                authorLabel={mine
                                  ? item.entry.actor
                                  : `${item.entry.actor} > ${messageRecipient(item.entry, myself)}`}
                                profileName={mine ? undefined : item.entry.actor}
                                messageIndex={item.index}
                              />
                            );
                          })}
                        </MessageGroup>
                      )}
                    </MessageScrollerItem>
                  );
                })}
              </MessageScrollerContent>
            </ChatContextMenu>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <WhisperComposer
        key={conversation.key}
        initialDraft={draft}
        canSend={canSend}
        placeholder={composerPlaceholder(conversation, canSend, presentGroupMembers)}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
      {error && <div className="cb-error" role="alert">{error}</div>}
    </>
  );
});

function RoomChatContact({
  active,
  onChoose,
}: {
  active: boolean;
  onChoose: (roomId: number) => void;
}) {
  const snapshot = React.useSyncExternalStore(
    subscribeRoomChatSessions,
    getRoomChatSessionSnapshot,
    getRoomChatSessionSnapshot,
  );
  const session = React.useMemo(getActiveRoomChatSession, [snapshot.revision]);
  if (!session) return null;
  const last = session.messages[session.messages.length - 1];
  return (
    <div className={`cb-contact cb-room-contact${active ? " is-active" : ""}`}>
      <button type="button" className="cb-contact-main" onClick={() => onChoose(session.roomId)}>
        <span className="cb-avatar cb-room-avatar"><MessagesSquare aria-hidden="true" /></span>
        <span className="cb-contact-copy">
          <span className="cb-contact-line">
            <strong>{session.name}</strong>
            {last && <time>{formatListTime(last.ts)}</time>}
          </span>
          <span className="cb-contact-line is-preview">
            <span>{last ? `${last.actor}: ${last.message}` : "Chat desta sala"}</span>
            <span className="cb-contact-indicators"><Pin aria-label="Fixada" /></span>
          </span>
        </span>
      </button>
    </div>
  );
}

function SubscribedRoomChatThread({
  api,
  roomId,
  onBack,
}: {
  api: LuminusApi;
  roomId: number;
  onBack: () => void;
}) {
  const snapshot = React.useSyncExternalStore(
    subscribeRoomChatSessions,
    getRoomChatSessionSnapshot,
    getRoomChatSessionSnapshot,
  );
  const session = React.useMemo(getActiveRoomChatSession, [snapshot.revision]);
  if (!session || session.roomId !== roomId) return null;
  return <RoomChatThread api={api} session={session} onBack={onBack} />;
}
function RoomChatThread({
  api,
  session,
  onBack,
}: {
  api: LuminusApi;
  session: RoomChatSession;
  onBack: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [error, setError] = React.useState("");
  const myself = api.myself?.username ?? "";
  const roomSearch = useRoomMessageSearch(session.messages, query);
  const filtered = roomSearch.messages;
  const filteredLen = filtered.length;
  const effectiveVisible = clampVisibleCount(visibleCount, filteredLen);
  const visible = React.useMemo(
    () => filtered.slice(Math.max(0, filteredLen - effectiveVisible)),
    [filtered, filteredLen, effectiveVisible],
  );
  const annotated = React.useMemo(() => annotateRoomMessages(visible), [visible]);
  const messageGroups = React.useMemo(() => groupAnnotatedRoomMessages(annotated), [annotated]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [session.roomId, query]);

  return (
    <>
      <header className="cb-thread-header cb-room-thread-header">
        <button type="button" className="cb-mobile-back" title="Voltar" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="cb-thread-person">
          <span className="cb-avatar cb-room-avatar"><MessagesSquare aria-hidden="true" /></span>
          <span>
            <strong>{session.name}</strong>
            <small>Sala atual · somente nesta sessão</small>
          </span>
        </div>
        <label className="cb-room-message-search">
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar jogador ou mensagem"
            aria-label="Buscar no chat da sala por jogador ou mensagem"
          />
          {query && <small>{roomSearch.complete ? filtered.length : "..."}</small>}
        </label>
      </header>

      <MessageScrollerProvider
        autoScroll={!query}
        defaultScrollPosition="end"
        scrollEdgeThreshold={16}
      >
        <MessageScrollerReset resetKey={`${session.roomId}:${query}`} />
        <MessageScroller className="cb-messages">
          <MessageScrollerViewport
            resumeAutoScrollAtEnd={!query}
            onScroll={event => {
              const element = event.currentTarget;
              if (element.scrollTop > 24 || effectiveVisible >= filteredLen) return;
              setVisibleCount(count => clampVisibleCount(count + PAGE_SIZE, filteredLen));
            }}
          >
            <MessageScrollerContent className="cb-message-flow">
              {effectiveVisible < filteredLen && (
                <MessageScrollerItem>
                  <button
                    type="button"
                    className="cb-load-older"
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      setVisibleCount(count => clampVisibleCount(count + PAGE_SIZE, filteredLen));
                    }}
                  >
                    <ChevronUp aria-hidden="true" /> Carregar anteriores
                    {filteredLen - effectiveVisible > 0 && (
                      <small> ({Math.min(PAGE_SIZE, filteredLen - effectiveVisible)})</small>
                    )}
                  </button>
                </MessageScrollerItem>
              )}
              {query && (
                <MessageScrollerItem>
                  <div className="cb-room-search-summary">
                    {!roomSearch.complete
                      ? "Buscando..."
                      : filtered.length
                      ? `${filtered.length} ${filtered.length === 1 ? "mensagem encontrada" : "mensagens encontradas"}`
                      : "Nenhuma mensagem encontrada"}
                  </div>
                </MessageScrollerItem>
              )}
              {!session.messages.length && (
                <MessageScrollerItem>
                  <div className="cb-message-empty">As mensagens desta sala aparecerão aqui.</div>
                </MessageScrollerItem>
              )}
              {session.messages.length > 0 && roomSearch.complete && !filtered.length && (
                <MessageScrollerItem>
                  <div className="cb-message-empty">Nenhuma mensagem corresponde à pesquisa.</div>
                </MessageScrollerItem>
              )}
              {messageGroups.map(group => {
                const first = group.items[0];
                return (
                  <MessageScrollerItem key={first.message.id} messageId={String(first.message.id)}>
                    {group.dayChanged && <div className="cb-day-separator">{formatDay(first.message.ts)}</div>}
                    <MessageGroup>
                      {group.items.map(item => {
                        const mine = sameName(item.message.actor, myself);
                        const role = classifyRoomChatRole({
                          kind: item.message.kind,
                          bubble: item.message.bubble,
                          unitType: item.message.unitType,
                          isMine: mine,
                          actor: item.message.actor,
                        });
                        const systemLike = role === "system";
                        const colored = parseChatColorTag(item.message.message);
                        return (
                          <ChatMessageRow
                            key={item.message.id}
                            api={api}
                            actor={item.message.actor}
                            figure={systemLike ? undefined : item.message.figure}
                            message={colored.text}
                            messageColor={colored.color}
                            ts={item.message.ts}
                            mine={mine && role === "user"}
                            start={item.start}
                            end={item.end}
                            kind={item.message.kind}
                            role={role}
                            authorLabel={systemLike ? "Sistema" : item.message.actor}
                            profileName={
                              systemLike || role === "bot" || role === "pet" || mine
                                ? undefined
                                : item.message.actor
                            }
                          />
                        );
                      })}
                    </MessageGroup>
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <WhisperComposer
        key={`room:${session.roomId}`}
        initialDraft=""
        canSend={api.myself?.index != null && api.room.id === session.roomId}
        placeholder={`Mensagem para ${session.name}`}
        onDraftChange={() => {}}
        onSend={message => {
          const sent = api.send(new RoomUnitChatComposer(message));
          setError(sent ? "" : "Não foi possível enviar a mensagem.");
          return sent;
        }}
      />
      {error && <div className="cb-error" role="alert">{error}</div>}
    </>
  );
}

const ROOM_SEARCH_FRAME_BUDGET_MS = 5;
const ROOM_SEARCH_CHECK_INTERVAL = 128;

function useRoomMessageSearch(messages: RoomChatMessage[], query: string): {
  messages: RoomChatMessage[];
  complete: boolean;
} {
  const wanted = React.useMemo(() => normalizeName(query), [query]);
  const [state, setState] = React.useState<{
    wanted: string;
    messages: RoomChatMessage[];
    complete: boolean;
  }>({ wanted: "", messages: [], complete: true });

  React.useEffect(() => {
    if (!wanted) {
      setState(previous => previous.wanted || previous.messages.length || !previous.complete
        ? { wanted: "", messages: [], complete: true }
        : previous);
      return;
    }

    let cancelled = false;
    let frame = 0;
    let cursor = 0;
    const matches: RoomChatMessage[] = [];
    const publish = (complete: boolean) => {
      if (!cancelled) setState({ wanted, messages: matches, complete });
    };
    const searchFrame = () => {
      const deadline = performance.now() + ROOM_SEARCH_FRAME_BUDGET_MS;
      while (cursor < messages.length && performance.now() < deadline) {
        const end = Math.min(cursor + ROOM_SEARCH_CHECK_INTERVAL, messages.length);
        for (; cursor < end; cursor += 1) {
          const message = messages[cursor];
          if (
            normalizeName(message.actor).includes(wanted)
            || normalizeName(message.message).includes(wanted)
          ) matches.push(message);
        }
      }
      const complete = cursor >= messages.length;
      publish(complete);
      if (!complete) frame = requestAnimationFrame(searchFrame);
    };

    publish(false);
    frame = requestAnimationFrame(searchFrame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [messages, messages.length, wanted]);

  if (!wanted) return { messages, complete: true };
  return state.wanted === wanted
    ? { messages: state.messages, complete: state.complete }
    : { messages: [], complete: false };
}

function annotateRoomMessages(messages: RoomChatMessage[]): Array<{
  message: RoomChatMessage;
  start: boolean;
  end: boolean;
}> {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const canGroup = (first: RoomChatMessage | undefined, second: RoomChatMessage | undefined) => Boolean(
      first
      && second
      && sameName(first.actor, second.actor)
      && second.ts - first.ts <= 5 * 60 * 1000
      && new Date(first.ts).toDateString() === new Date(second.ts).toDateString(),
    );
    return {
      message,
      start: !canGroup(previous, message),
      end: !canGroup(message, next),
    };
  });
}

function groupAnnotatedRoomMessages(
  messages: Array<{ message: RoomChatMessage; start: boolean; end: boolean }>,
): Array<{
  dayChanged: boolean;
  items: Array<{ message: RoomChatMessage; start: boolean; end: boolean }>;
}> {
  const groups: Array<{
    dayChanged: boolean;
    items: Array<{ message: RoomChatMessage; start: boolean; end: boolean }>;
  }> = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const dayChanged = !previous
      || new Date(previous.message.ts).toDateString() !== new Date(message.message.ts).toDateString();
    const current = groups[groups.length - 1];
    if (message.start || dayChanged || !current) groups.push({ dayChanged, items: [message] });
    else current.items.push(message);
  });
  return groups;
}

function WhisperComposer({
  initialDraft,
  canSend,
  placeholder,
  onDraftChange,
  onSend,
}: {
  initialDraft: string;
  canSend: boolean;
  placeholder: string;
  onDraftChange: (value: string) => void;
  onSend: (message: string) => boolean;
}) {
  const [draft, setDraft] = React.useState(initialDraft);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    if (textareaRef.current) autoSizeTextarea(textareaRef.current);
  }, [draft]);

  return (
    <form
      className="cb-composer"
      onSubmit={event => {
        event.preventDefault();
        const message = draft.trim();
        if (!message || !canSend || !onSend(message)) return;
        setDraft("");
        onDraftChange("");
      }}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        rows={1}
        maxLength={100}
        disabled={!canSend}
        placeholder={placeholder}
        onChange={event => {
          const value = event.target.value;
          setDraft(value);
          onDraftChange(value);
        }}
        onKeyDown={event => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
      />
      <button type="submit" className="cb-send" disabled={!canSend || !draft.trim()} title="Enviar">
        <Send aria-hidden="true" />
      </button>
    </form>
  );
}

function MessageScrollerReset({ resetKey }: { resetKey: string }) {
  const { scrollToEnd } = useMessageScroller();

  React.useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToEnd({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [resetKey, scrollToEnd]);

  return null;
}

function NewChatDialog({
  api,
  container,
  myself,
  roomUsers,
  conversations,
  onClose,
  onOpenPerson,
  onOpenGroup,
}: {
  api: LuminusApi;
  container: HTMLElement | null;
  myself: string;
  roomUsers: ReturnType<typeof roomUsersType>;
  conversations: ChatConversationView[];
  onClose: () => void;
  onOpenPerson: (name: string, figure?: string) => void;
  onOpenGroup: (members: string[], name: string) => void;
}) {
  const [mode, setMode] = React.useState<NewChatMode>("person");
  const [query, setQuery] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [remote, setRemote] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  /** How many room rows are mounted (grows on scroll; never a hard total cap). */
  const [visibleCount, setVisibleCount] = React.useState(NEW_CHAT_ROOM_PAGE);

  React.useEffect(() => {
    setVisibleCount(NEW_CHAT_ROOM_PAGE);
  }, [query, mode]);

  const roomResultsAll: SearchResult[] = roomUsers
    .filter(unit => !sameName(unit.name, myself) && includesNormalized(unit.name, query))
    .map(unit => ({ id: unit.id, name: unit.name, figure: unit.figure, source: "room" }));
  const roomResults = roomResultsAll.slice(0, visibleCount);
  const roomHasMore = roomResults.length < roomResultsAll.length;
  const historyResults: SearchResult[] = conversations
    .filter(item => item.kind === "user" && includesNormalized(item.recipient, query))
    .filter(item => !roomResultsAll.some(result => sameName(result.name, item.recipient)))
    .map(item => ({ id: 0, name: item.recipient, figure: item.figure, source: "history" }));

  React.useEffect(() => {
    setRemote([]);
    if (mode !== "person" || query.trim().length < 2) {
      setSearching(false);
      return;
    }
    let disposed = false;
    let unsubscribe: (() => void) | null = null;
    let responseTimeout = 0;
    const timer = window.setTimeout(() => {
      setSearching(true);
      unsubscribe = api.onIncoming(973, ({ packet }) => {
        const data = packet.parsed as MessengerSearch | undefined;
        if (!data || disposed) return;
        // Exclude anyone already listed in room/history at response time (not as effect deps).
        const roomNames = roomUsers
          .filter(unit => !sameName(unit.name, myself) && includesNormalized(unit.name, query))
          .map(unit => unit.name);
        const historyNames = conversations
          .filter(item => item.kind === "user" && includesNormalized(item.recipient, query))
          .map(item => item.recipient);
        setRemote(data.users
          .filter(user => includesNormalized(user.name, query))
          .filter(user => !roomNames.some(name => sameName(name, user.name)))
          .filter(user => !historyNames.some(name => sameName(name, user.name)))
          .map(user => ({ id: user.id, name: user.name, source: "habblet" })));
        setSearching(false);
        unsubscribe?.();
        unsubscribe = null;
      });
      if (!api.send(new HabboSearchComposer(query.trim()))) {
        setSearching(false);
        unsubscribe();
        unsubscribe = null;
      }
      responseTimeout = window.setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
        if (!disposed) setSearching(false);
      }, 5000);
    }, 350);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.clearTimeout(responseTimeout);
      unsubscribe?.();
    };
    // roomUsers/conversations read at response time only — do not re-fire on presence churn.
  }, [api, mode, query, myself]);

  const groupUsersAll = roomUsers
    .filter(unit => !sameName(unit.name, myself) && includesNormalized(unit.name, query));
  const groupUsers = groupUsersAll.slice(0, visibleCount);
  const groupHasMore = groupUsers.length < groupUsersAll.length;
  const listHasMore = mode === "person" ? roomHasMore : groupHasMore;

  const loadMoreRoomRows = React.useCallback(() => {
    setVisibleCount(count => {
      const total = mode === "person" ? roomResultsAll.length : groupUsersAll.length;
      if (count >= total) return count;
      return Math.min(total, count + NEW_CHAT_ROOM_PAGE);
    });
  }, [mode, roomResultsAll.length, groupUsersAll.length]);

  return (
    <Dialog.Root open onOpenChange={isOpen => !isOpen && onClose()}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="cb-modal-backdrop" />
        <Dialog.Content className="cb-dialog cb-new-dialog" aria-describedby={undefined}>
          <div className="cb-dialog-head">
            <Dialog.Title asChild><strong>Nova conversa</strong></Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" title="Fechar"><X /></button>
            </Dialog.Close>
          </div>
          <Tabs.Root
            className="cb-new-tabs"
            value={mode}
            onValueChange={value => setMode(value as NewChatMode)}
          >
            <Tabs.List className="cb-mode-tabs" aria-label="Tipo de conversa">
              <Tabs.Trigger value="person"><UserRound /> Pessoa</Tabs.Trigger>
              <Tabs.Trigger value="group"><UsersRound /> Grupo</Tabs.Trigger>
            </Tabs.List>
            {mode === "group" && (
              <input
                className="cb-group-name"
                value={groupName}
                maxLength={60}
                onChange={event => setGroupName(event.target.value)}
                placeholder="Nome do grupo (opcional)"
              />
            )}
            <label className="cb-search is-dialog">
              <Search aria-hidden="true" />
              <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pessoas" />
            </label>
            {mode === "group" && selected.length > 0 && (
              <div className="cb-selected-members">
                {selected.map(name => (
                  <button type="button" key={name} onClick={() => setSelected(current => current.filter(item => item !== name))}>
                    {name}<X />
                  </button>
                ))}
              </div>
            )}
            <NewChatPeopleScroll hasMore={listHasMore} onNearEnd={loadMoreRoomRows}>
              {mode === "person" ? (
                <>
                  <ResultSection
                    title="No quarto"
                    results={roomResults}
                    footer={roomHasMore
                      ? `${roomResults.length} de ${roomResultsAll.length} — role para carregar mais`
                      : roomResultsAll.length > NEW_CHAT_ROOM_PAGE
                        ? `${roomResultsAll.length} no quarto`
                        : undefined}
                    onSelect={result => onOpenPerson(result.name, result.figure)}
                  />
                  <ResultSection title="Histórico" results={historyResults} onSelect={result => onOpenPerson(result.name, result.figure)} />
                  <ResultSection title={searching ? "Buscando no Habblet..." : "Habblet"} results={remote} onSelect={result => onOpenPerson(result.name)} />
                </>
              ) : groupUsers.length ? (
                <>
                  {groupUsers.map(unit => {
                    const checked = selected.some(name => sameName(name, unit.name));
                    return (
                      <button
                        type="button"
                        className={`cb-search-result${checked ? " is-selected" : ""}`}
                        key={unit.index}
                        onClick={() => setSelected(current => checked
                          ? current.filter(name => !sameName(name, unit.name))
                          : [...current, unit.name])}
                      >
                        <Avatar figure={unit.figure} name={unit.name} />
                        <span className="cb-search-copy"><strong>{unit.name}</strong><small>No quarto</small></span>
                        <i>{checked && <Check />}</i>
                      </button>
                    );
                  })}
                  {groupHasMore && (
                    <div className="cb-list-empty">
                      {groupUsers.length} de {groupUsersAll.length} — role para carregar mais
                    </div>
                  )}
                </>
              ) : <div className="cb-list-empty">Nenhuma pessoa encontrada no quarto.</div>}
            </NewChatPeopleScroll>
            {mode === "group" && (
              <div className="cb-dialog-actions">
                <Dialog.Close asChild><button type="button">Cancelar</button></Dialog.Close>
                <button type="button" className="is-primary" disabled={!selected.length} onClick={() => onOpenGroup(selected, groupName)}>
                  Criar grupo
                </button>
              </div>
            )}
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Native overflow list so wheel/trackpad always scrolls.
 * Prefetches the next page of room rows before the user reaches the end.
 */
function NewChatPeopleScroll({
  children,
  hasMore = false,
  onNearEnd,
}: {
  children: React.ReactNode;
  hasMore?: boolean;
  onNearEnd?: () => void;
}) {
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
  const onNearEndRef = React.useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const hasMoreRef = React.useRef(hasMore);
  hasMoreRef.current = hasMore;

  const maybePrefetch = React.useCallback((el: HTMLElement) => {
    if (!hasMoreRef.current || !onNearEndRef.current) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Load next page early (before bottom rows enter view) + when list doesn't fill viewport.
    if (remaining < NEW_CHAT_PREFETCH_PX) onNearEndRef.current();
  }, []);

  React.useLayoutEffect(() => {
    if (!root) return;
    maybePrefetch(root);
  }, [root, children, hasMore, maybePrefetch]);

  return (
    <AvatarScrollRootContext.Provider value={root}>
      <div
        ref={setRoot}
        className="cb-search-scroll-native cb-search-results"
        onScroll={event => maybePrefetch(event.currentTarget)}
      >
        {children}
      </div>
    </AvatarScrollRootContext.Provider>
  );
}

function ResultSection({
  title,
  results,
  onSelect,
  footer,
}: {
  title: string;
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  footer?: string;
}) {
  if (!results.length && title !== "Buscando no Habblet..." && !footer) return null;
  return (
    <section className="cb-result-section">
      <h4>{title}</h4>
      {results.map(result => (
        <button type="button" className="cb-search-result" key={`${result.source}-${result.name}`} onClick={() => onSelect(result)}>
          <Avatar figure={result.figure} name={result.name} />
          <span className="cb-search-copy">
            <strong>{result.name}</strong>
            <small>{result.source === "room" ? "No quarto" : result.source === "history" ? "Conversa anterior" : "Fora do quarto"}</small>
          </span>
        </button>
      ))}
      {footer && <div className="cb-list-empty">{footer}</div>}
    </section>
  );
}

function ConversationAvatar({
  api,
  conversation,
  roomUsers,
  eager = false,
}: {
  api: LuminusApi;
  conversation: ChatConversationView;
  roomUsers: ReturnType<typeof roomUsersType>;
  eager?: boolean;
}) {
  if (conversation.kind === "user") {
    const figure = roomUsers.find(unit => sameName(unit.name, conversation.recipient))?.figure
      ?? conversation.figure;
    return <Avatar api={api} figure={figure} name={conversation.displayName} eager={eager} />;
  }
  const figures = conversation.members
    .map(name => ({ name, figure: roomUsers.find(unit => sameName(unit.name, name))?.figure }))
    .filter((item): item is { name: string; figure: string } => Boolean(item.figure))
    .slice(0, 3);
  return (
    <span className={`cb-avatar cb-group-avatar count-${figures.length}`}>
      {figures.length
        ? figures.map((item, index) => (
            <AvatarPrimitive.Root className="cb-group-head" key={`${item.figure}-${index}`}>
              <AvatarImage figure={item.figure} name={item.name} eager={eager} />
            </AvatarPrimitive.Root>
          ))
        : <UsersRound aria-hidden="true" />}
    </span>
  );
}

function Avatar({
  api,
  figure,
  name,
  eager = false,
}: {
  api?: LuminusApi;
  figure?: string;
  name: string;
  eager?: boolean;
}) {
  // Prefer explicit figure (list/search already has it). Only scan room map if missing.
  const currentFigure = figure
    ?? (api ? findAvatarRoomUnit(api, name)?.figure : undefined);
  return (
    <AvatarPrimitive.Root className="cb-avatar">
      {currentFigure
        ? <AvatarImage figure={currentFigure} name={name} eager={eager} />
        : <AvatarPrimitive.Fallback className="cb-avatar-pending">{name.slice(0, 1).toUpperCase()}</AvatarPrimitive.Fallback>}
    </AvatarPrimitive.Root>
  );
}

function AvatarImage({
  figure,
  name,
  eager = false,
}: {
  figure: string;
  name: string;
  eager?: boolean;
}) {
  const identity = `${normalizeName(name)}:${figure}`;
  return <AvatarImageLoader key={identity} figure={figure} name={name} eager={eager} />;
}

function AvatarImageLoader({
  figure,
  name,
  eager,
}: {
  figure: string;
  name: string;
  eager: boolean;
}) {
  const scrollRoot = React.useContext(AvatarScrollRootContext);
  const pendingRef = React.useRef<HTMLSpanElement>(null);
  const alreadyCached = isFigureImagingCached(figure);
  const [visible, setVisible] = React.useState(eager || alreadyCached);
  const [source, setSource] = React.useState<string | null>(
    alreadyCached || eager ? resolveFigureImaging(figure) : null,
  );

  React.useEffect(() => {
    if (eager || alreadyCached) return;
    const element = pendingRef.current;
    if (!element) return;
    return observeAvatarVisibility(element, () => setVisible(true), scrollRoot);
  }, [eager, alreadyCached, scrollRoot]);

  const releaseRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!visible && !eager) return;
    let cancelled = false;
    const url = resolveFigureImaging(figure);

    void (async () => {
      if (!isFigureImagingCached(figure)) {
        const release = await acquireFigureImagingSlot(figure);
        if (cancelled) {
          release();
          return;
        }
        releaseRef.current = release;
      }
      if (cancelled) {
        releaseRef.current?.();
        releaseRef.current = null;
        return;
      }
      setSource(url);
    })();

    return () => {
      cancelled = true;
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [figure, visible, eager]);

  const releaseSlot = () => {
    releaseRef.current?.();
    releaseRef.current = null;
  };

  return (
    <>
      {source && (
        <AvatarPrimitive.Image
          src={source}
          alt=""
          loading={alreadyCached || eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => {
            markFigureImagingReady(figure);
            releaseSlot();
          }}
          onError={() => {
            markFigureImagingError(figure);
            releaseSlot();
          }}
        />
      )}
      <AvatarPrimitive.Fallback ref={pendingRef} className="cb-avatar-pending">
        {name.slice(0, 1).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </>
  );
}

const ChatMessageRow = React.memo(function ChatMessageRow({
  api,
  actor,
  figure,
  message,
  messageColor,
  ts,
  mine,
  start,
  end = false,
  kind,
  role,
  authorLabel,
  profileName,
  actions,
  messageIndex,
}: {
  api: LuminusApi;
  actor: string;
  figure?: string;
  message: string;
  /** Optional text color from Habblet `@color@` tag. */
  messageColor?: string | null;
  ts: number;
  mine: boolean;
  start: boolean;
  end?: boolean;
  kind?: "chat" | "shout" | "whisper";
  role?: RoomChatRole;
  authorLabel: string;
  /** Stable name for profile open — avoids new function props that defeat memo. */
  profileName?: string;
  actions?: ChatMenuAction[];
  messageIndex?: number;
}) {
  const authorRef = React.useRef<HTMLElement>(null);
  const [expandAuthor, setExpandAuthor] = React.useState(false);
  const resolvedRole = role
    ?? (kind === "whisper" ? "whisper" : kind === "shout" ? "shout" : "user");
  const isSystem = resolvedRole === "system";
  const isBot = resolvedRole === "bot";
  const roleLabel = roomChatRoleLabel(resolvedRole);

  React.useLayoutEffect(() => {
    const author = authorRef.current;
    if (!author || expandAuthor) return;
    if (author.scrollWidth > author.clientWidth) setExpandAuthor(true);
  }, [authorLabel, expandAuthor]);

  const authorClassName = `cb-message-author${mine ? " is-local" : ""}${expandAuthor ? " is-expanded" : ""}${isBot ? " is-bot" : ""}${isSystem ? " is-system" : ""}`;
  const openProfile = profileName
    ? () => openUserProfile(api, profileName)
    : undefined;

  const bubbleVariant = mine
    ? "tinted"
    : kind === "whisper" || resolvedRole === "whisper"
      ? "outline"
      : isSystem
        ? "muted"
        : isBot
          ? "secondary"
          : "secondary";

  return (
    <Message
      align={mine ? "end" : "start"}
      className={[
        "cb-message",
        mine ? "is-mine" : "",
        start ? "is-start" : "",
        end ? "is-end" : "",
        kind === "shout" || resolvedRole === "shout" ? "is-shout" : "",
        kind === "whisper" || resolvedRole === "whisper" ? "is-whisper" : "",
        isBot ? "is-bot" : "",
        isSystem ? "is-system" : "",
      ].filter(Boolean).join(" ")}
      data-message-index={messageIndex}
      data-role={resolvedRole}
    >
      {!mine && (
        <MessageAvatarSlot className={start ? undefined : "is-spacer"}>
          {start && (
            isSystem ? (
              <span className="cb-avatar cb-role-avatar is-system" title="Sistema">
                <MessagesSquare aria-hidden="true" />
              </span>
            ) : (
              // Bots keep a normal author avatar (figure); only the BOT chip marks them.
              <Avatar api={api} figure={figure} name={actor} />
            )
          )}
        </MessageAvatarSlot>
      )}
      <MessageContent>
        <Bubble
          align={mine ? "end" : "start"}
          variant={bubbleVariant}
          className={`cb-bubble${isBot ? " is-bot" : ""}${isSystem ? " is-system" : ""}`}
        >
          <BubbleContent>
            {start && (
              <span className="cb-message-author-row">
                {openProfile ? (
                  <button ref={authorRef as React.Ref<HTMLButtonElement>} type="button" className={authorClassName} onClick={openProfile}>
                    {authorLabel}
                  </button>
                ) : (
                  <span ref={authorRef as React.Ref<HTMLSpanElement>} className={authorClassName}>
                    {authorLabel}
                  </span>
                )}
                {isBot && (
                  <span className="cb-role-chip is-bot" title="Mensagem de bot">
                    <Bot aria-hidden="true" />
                    Bot
                  </span>
                )}
                {isSystem && (
                  <span className="cb-role-chip is-system" title="Mensagem do sistema / wired">
                    Sistema
                  </span>
                )}
                {roleLabel && resolvedRole === "shout" && (
                  <span className="cb-role-chip is-shout">Grito</span>
                )}
                {roleLabel && resolvedRole === "whisper" && (
                  <span className="cb-role-chip is-whisper">Sussurro</span>
                )}
              </span>
            )}
            <div className="cb-bubble-body">
              <p style={messageColor ? { color: messageColor } : undefined}>{message}</p>
              <time>{formatTime(ts)}</time>
            </div>
          </BubbleContent>
          {actions?.length ? (
            <ChatDropdownMenu actions={actions} align={mine ? "start" : "end"}>
              <button
                type="button"
                className="cb-message-menu"
                title="Ações da mensagem"
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
            </ChatDropdownMenu>
          ) : null}
        </Bubble>
      </MessageContent>
    </Message>
  );
});

function findAvatarRoomUnit(api: LuminusApi, name: string) {
  for (const unit of api.room.units.values()) {
    if (unit.type === 1 && sameName(unit.name, name)) return unit;
  }
  return undefined;
}

function observeAvatarVisibility(
  element: Element,
  onVisible: () => void,
  root: Element | null = null,
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onVisible();
    return () => {};
  }
  const mapKey: Element | "window" = root ?? "window";
  let observer = avatarVisibilityObservers.get(mapKey);
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = avatarVisibilityCallbacks.get(entry.target);
        avatarVisibilityCallbacks.delete(entry.target);
        entry.target && observer?.unobserve(entry.target);
        callback?.();
      }
    }, {
      root: root ?? null,
      // Small margin: enough to prefetch one row, not the whole dialog list.
      rootMargin: root ? "48px" : "80px",
      threshold: 0.01,
    });
    avatarVisibilityObservers.set(mapKey, observer);
  }
  avatarVisibilityCallbacks.set(element, onVisible);
  observer.observe(element);
  return () => {
    avatarVisibilityCallbacks.delete(element);
    observer?.unobserve(element);
  };
}

function roomUsersType() {
  return [] as Array<{ id: number; index: number; name: string; figure: string; type: number }>;
}

function messageRecipient(entry: LogEntry, myself: string): string {
  if (entry.target && normalizeName(entry.target) !== "group") return entry.target;
  return myself || "Você";
}

function compareConversations(a: ChatConversationView, b: ChatConversationView): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return (b.lastWhisper?.ts ?? b.openedAt) - (a.lastWhisper?.ts ?? a.openedAt);
}

function matchesConversation(conversation: ChatConversationView, query: string): boolean {
  if (!query.trim()) return true;
  const wanted = normalizeName(query);
  return normalizeName(conversation.displayName).includes(wanted)
    || normalizeName(conversation.lastWhisper?.message ?? "").includes(wanted)
    || conversation.members.some(member => normalizeName(member).includes(wanted));
}

function conversationPreview(conversation: ChatConversationView, draft: string | undefined): string {
  if (draft?.trim()) return `Rascunho: ${draft.trim()}`;
  const entry = conversation.lastWhisper;
  if (!entry) return "Sem mensagens";
  if (isLocalChatMessage(entry, conversation)) return `${entry.actor}: ${entry.message}`;
  return conversation.kind === "group" ? `${entry.actor}: ${entry.message}` : entry.message;
}

function conversationStatus(
  conversation: ChatConversationView,
  directInRoom: boolean,
  presentGroupMembers: number,
  myself: string,
): string {
  if (conversation.kind === "user") return directInRoom ? "No quarto" : "Fora do quarto";
  const total = conversation.members.filter(name => !sameName(name, myself)).length;
  return `${presentGroupMembers} de ${total} no quarto`;
}

function typingLabel(conversation: ChatConversationView, typing: Record<string, number>): string {
  if (conversation.kind === "user") {
    return typing[normalizeName(conversation.recipient)] ? "digitando..." : "";
  }
  const names = conversation.members.filter(name => typing[normalizeName(name)]);
  if (!names.length) return "";
  if (names.length === 1) return `${names[0]} está digitando...`;
  return `${names.length} pessoas estão digitando...`;
}

function composerPlaceholder(conversation: ChatConversationView, canSend: boolean, presentMembers: number): string {
  if (canSend) return `Mensagem para ${conversation.displayName}`;
  if (conversation.kind === "group" && !presentMembers) return "Nenhum membro do grupo está no quarto";
  return `${conversation.displayName} está fora do quarto`;
}

function clampGeometry(geometry: { left: number | null; top: number; width: number; height: number }) {
  // Chat-specific: topGap 0 (not the global 8px used by panel/logs).
  const b = getChatSafeBounds();
  // Horizontal: only limited by the Nitro stage (can use full safe width).
  const minW = Math.min(680, b.width);
  const minH = Math.min(420, b.height);
  const width = clamp(geometry.width, minW, b.width);
  const height = clamp(geometry.height, minH, b.height);
  return {
    width,
    height,
    left: geometry.left == null
      ? null
      : clamp(geometry.left, b.left, Math.max(b.left, b.right - width)),
    // Vertical: flush top, stay above the toolbar (b.bottom is exclusive).
    top: clamp(geometry.top, b.top, Math.max(b.top, b.bottom - height)),
  };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatListTime(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(ts);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDay(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function autoSizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = "34px";
  element.style.height = `${Math.min(92, element.scrollHeight)}px`;
}

function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function includesNormalized(value: string, query: string): boolean {
  return !query.trim() || normalizeName(value).includes(normalizeName(query));
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}
