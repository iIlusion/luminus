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
  version: "1.3.0",
  title: "Luminus 1.3",
  summary:
    "Um painel mais organizado, mais controle no quarto e menus bem mais fáceis de ler.",
  publishedAt: "27 de agosto de 2026",
  sections: [
    {
      title: "Novo",
      items: [
        {
          title: "Busca no painel",
          description:
            "Organizei as categorias e coloquei uma busca para você achar qualquer função sem ficar procurando aba por aba.",
        },
        {
          title: "Lista de Habblets",
          description:
            "A lista agora tem filtros por nome, gênero, extensão e links, além de poder ser expandida quando você quiser ver mais jogadores.",
        },
        {
          title: "Identificação no quarto",
          description:
            "Adicionei ícones em cima dos avatares para mostrar presenças compatíveis e deixei essa opção configurável no painel.",
        },
        {
          title: "Ações ao entrar no quarto",
          description:
            "Agora dá para deixar zoom, enable, handitem, pet e tele configurados para serem aplicados automaticamente quando você entrar.",
        },
        {
          title: "Compatibilidade com extensões externas",
          description:
            "Melhorei a compatibilidade com extensões externas para elas funcionarem junto com o Luminus sem atrapalhar a experiência.",
        },
      ],
    },
    {
      title: "Melhorado",
      items: [
        {
          title: "Painel de configurações",
          description:
            "Deixei as opções mais bem separadas, com grupos expansíveis, filtros mais claros e uma navegação bem mais rápida.",
        },
        {
          title: "Janelas e menus",
          description:
            "Dei uma geral no visual das janelas, botões, filtros e menus para tudo ficar mais consistente e legível.",
        },
        {
          title: "Fechar com Esc",
          description:
            "Ficou mais rápido fechar logs, links, conversas e outras janelas usando a tecla Esc.",
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
