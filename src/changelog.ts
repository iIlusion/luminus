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
  version: "1.4.0",
  title: "Luminus 1.4.0",
  summary:
    "Mais estabilidade na integração com o hotel, com a barra de ferramentas no lugar e os recursos acompanhando o layout escolhido.",
  publishedAt: "20 de setembro de 2026",
  sections: [
    {
      title: "Novo",
      items: [
        {
          title: "Opção de compatibilidade",
          description:
            "Ative o Fix integração na aba Experimental para manter os recursos do Luminus funcionando quando o hotel atualizar a sua interface.",
          details: [
            "Desative a opção quando a integração voltar a funcionar normalmente.",
          ],
        },
      ],
    },
    {
      title: "Melhorado",
      items: [
        {
          title: "Barra de ferramentas",
          description:
            "Os ícones do Luminus permanecem junto dos ícones nativos na barra inferior, sem criar uma barra separada ou deslocar a barra principal.",
        },
        {
          title: "Prioridade do layout",
          description:
            "O autocomplete de comandos acompanha a prioridade escolhida para o layout e evita duas interfaces concorrendo pelo mesmo campo de chat.",
        },
      ],
    },
    {
      title: "Corrigido",
      items: [
        {
          title: "Inicialização da interface",
          description:
            "Corrigido o problema que impedia os controles e janelas do Luminus de aparecerem quando a interface do hotel era reconstruída.",
        },
        {
          title: "Posição da barra",
          description:
            "Corrigido o problema que movia a barra de ferramentas para cima ao ativar a compatibilidade.",
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
