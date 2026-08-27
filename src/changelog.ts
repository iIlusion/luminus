import { readPref, writePref } from "./util/prefs";

export interface ChangelogVisualFrame {
  label: string;
  title: string;
  description?: string;
}

export interface ChangelogDemoRow {
  label: string;
  value: string;
}

/** Mídia segura e declarativa para demonstrar uma mudança sem HTML arbitrário. */
export type ChangelogVisual =
  | {
      kind: "image";
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      kind: "comparison";
      before: ChangelogVisualFrame;
      after: ChangelogVisualFrame;
      caption?: string;
    }
  | {
      kind: "demo";
      title: string;
      description?: string;
      badges?: readonly string[];
      rows?: readonly ChangelogDemoRow[];
      action?: string;
      caption?: string;
    };

export interface ChangelogItem {
  title: string;
  description: string;
  /** Detalhes opcionais ficam recolhidos para manter a leitura rápida. */
  details?: readonly string[];
  /** Uma prova visual opcional: imagem, antes/depois ou demonstração nativa. */
  visual?: ChangelogVisual;
}

export interface ChangelogSection {
  title: string;
  items: readonly ChangelogItem[];
}

/** Uma entrada do modal de novidades (versão + secções). */
export interface ChangelogLayer {
  id: string;
  label: string;
  /** Versão desta entrada; o modal reabre se for diferente da última vista. */
  version: string;
  title: string;
  summary: string;
  publishedAt: string;
  sections: readonly ChangelogSection[];
}

/** @deprecated Prefer ChangelogLayer — alias para código antigo. */
export type Changelog = ChangelogLayer;

export function defineChangelog<const T extends ChangelogLayer>(changelog: T): T {
  return changelog;
}

/**
 * Changelog atual do Luminus.
 * Atualizar só em release explícita pedida pelo maintainer.
 */
export const LUMINUS_CHANGELOG_LAYER = defineChangelog({
  id: "luminus",
  label: "Luminus",
  version: "1.2.0",
  title: "Luminus 1.2",
  summary:
    "Explore novos visuais, organize seus looks e use o hotel com mais conforto.",
  publishedAt: "8 de agosto de 2026",
  sections: [
    {
      title: "Novo",
      items: [
        {
          title: "Menu de enables e handitems",
          description:
            "Abra o menu no painel para escolher efeitos e itens de mão animados e ver cada visual com o seu avatar.",
        },
        {
          title: "Importar e exportar looks",
          description:
            "Salve seus looks em um código e recupere-os depois, substituindo os slots ou preenchendo os primeiros slots livres.",
        },
        {
          title: "Chat privado redesenhado",
          description:
            "Abra conversas separadas, pesquise mensagens e acompanhe o histórico com mais conforto.",
        },
        {
          title: "Histórico do chat do quarto",
          description:
            "Consulte o que foi falado na sala enquanto você continua jogando.",
        },
        {
          title: "Controle de mobis",
          description:
            "Oculte tipos de mobi pelo painel ou pelo infostand para deixar a sala mais limpa.",
        },
        {
          title: "Opções de renderização",
          description:
            "Ajuste o desenho do quarto pelo painel quando quiser mais leveza ou mais detalhes.",
        },
      ],
    },
    {
      title: "Melhorado",
      items: [
        {
          title: "Mute geral",
          description:
            "Esconda ou mostre avatares e balões mutados com menos mudanças inesperadas.",
        },
        {
          title: "Janelas do painel",
          description:
            "Mova e redimensione o painel, os logs, os links e o chat sem perder partes da janela.",
        },
        {
          title: "Leitura dos logs",
          description:
            "Acompanhe cliques, mensagens privadas e entradas ou saídas com mais clareza.",
        },
        {
          title: "Perfis e avatares",
          description:
            "Abra perfis e veja avatares com respostas mais rápidas nas janelas do hotel.",
        },
        {
          title: "Mensagens de respeito",
          description:
            "As mensagens de respeito ocupam menos espaço e ficam mais fáceis de acompanhar.",
        },
      ],
    },
    {
      title: "Corrigido",
      items: [
        {
          title: "Escolha de duas cores",
          description:
            "Ao escolher um visual com duas cores, as duas paletas ficam visíveis.",
        },
        {
          title: "Avisos de cliques recebidos",
          description:
            "Os avisos de cliques recebidos aparecem corretamente nos logs e nas conversas.",
        },
        {
          title: "Links das missões",
          description:
            "Os links das missões ficam clicáveis assim que aparecem no perfil.",
        },
        {
          title: "Envio de mensagens privadas",
          description:
            "Mensagens privadas chegam com mais regularidade em conversas longas.",
        },
        {
          title: "Grupos de conversa",
          description:
            "Gerenciar um grupo de conversa não remove mensagens das suas abas por engano.",
        },
        {
          title: "Troca de quarto",
          description:
            "Ao entrar em outra sala, as opções da sala anterior não permanecem por engano.",
        },
      ],
    },
  ],
});

/** @deprecated Use LUMINUS_CHANGELOG_LAYER */
export const CURRENT_CHANGELOG = LUMINUS_CHANGELOG_LAYER;

const DEFAULT_SEEN_KEY = "luminus.changelog.seenVersions";

/**
 * Devolve as camadas a mostrar se alguma versão mudou desde o último visto.
 * Grava as versões atuais ao reclamar (evita reabrir no mesmo load).
 */
export function claimChangelogLayers(
  layers: readonly ChangelogLayer[],
  prefsKey: string = DEFAULT_SEEN_KEY,
): ChangelogLayer[] | null {
  if (!layers.length) return null;
  const seen = readPref<Record<string, string>>(prefsKey, {});
  const changed = layers.some(layer => seen[layer.id] !== layer.version);
  if (!changed) return null;

  const next: Record<string, string> = { ...seen };
  for (const layer of layers) {
    next[layer.id] = layer.version;
  }
  writePref(prefsKey, next);
  return [...layers];
}

/** Luminus-only claim (compat). */
export function claimCurrentChangelog(): ChangelogLayer[] | null {
  return claimChangelogLayers([LUMINUS_CHANGELOG_LAYER]);
}
