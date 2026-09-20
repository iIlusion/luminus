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
  version: "1.3.1",
  title: "Luminus 1.3.1",
  summary:
    "Mais agilidade para construir, buscar comandos e identificar corretamente quem está no quarto.",
  publishedAt: "20 de setembro de 2026",
  sections: [
    {
      title: "Novo",
      items: [
        {
          title: "Atalhos rápidos para mobis",
          description:
            "Use F1 a F8 para abrir o inventário e encontrar categorias de mobis. Ctrl+Z e Ctrl+Y desfazem ou refazem ações, e Esc finaliza a colocação ou movimentação no ponto atual do mouse.",
          details: [
            "Cada atalho pode ser ativado ou desativado no submenu Quarto.",
            "O inventário é carregado automaticamente antes da primeira busca quando você está no quarto.",
          ],
        },
        {
          title: "Autocomplete de comandos no chat",
          description:
            "Digite : no chat para encontrar comandos do hotel com sugestões rápidas, navegação pelas setas e confirmação com Enter ou Tab.",
          details: [
            "A lista mostra descrições e avisos para comandos que exigem mais atenção.",
          ],
        },
      ],
    },
    {
      title: "Melhorado",
      items: [
        {
          title: "Busca do inventário",
          description:
            "A primeira pesquisa aguarda o carregamento do inventário terminar antes de aplicar o filtro, evitando atalhos sem resultado.",
        },
        {
          title: "Controles do quarto",
          description:
            "Os atalhos de construção respeitam o quarto atual e podem ser ligados ou desligados individualmente no submenu Quarto.",
        },
      ],
    },
    {
      title: "Corrigido",
      items: [
        {
          title: "Identificação de usuários",
          description:
            "Bots com o mesmo nome de um usuário não substituem mais o ícone, o infostand ou os links da pessoa real.",
        },
        {
          title: "Log de cliques",
          description:
            "Nomes com pontuação agora são reconhecidos exatamente, mantendo a associação correta com o usuário e a figura no registro de cliques.",
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
