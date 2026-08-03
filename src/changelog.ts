import { readPref, writePref } from "./util/prefs";

/** Uma entrada do modal de novidades (versão + secções). */
export interface ChangelogLayer {
  id: string;
  label: string;
  /** Versão desta entrada; o modal reabre se for diferente da última vista. */
  version: string;
  title: string;
  summary: string;
  publishedAt: string;
  sections: readonly {
    title: string;
    items: readonly {
      title: string;
      description: string;
    }[];
  }[];
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
    "Chat privado redesenhado, mais controle sobre mobis e mute, e janelas que se comportam melhor no hotel.",
  publishedAt: "3 de agosto de 2026",
  sections: [
    {
      title: "Novo",
      items: [
        {
          title: "Chat privado redesenhado",
          description:
            "O botão Chat abre uma janela própria com abas por conversa, busca, avatares e rolagem mais confortável, sem depender só do chat nativo.",
        },
        {
          title: "Memória do chat do quarto",
          description:
            "O histórico do que foi falado no quarto fica disponível de forma mais estável enquanto você usa o hotel.",
        },
        {
          title: "Ocultar classe de mobis",
          description:
            "Na aba Renderização e no infostand, você pode esconder tipos de mobi (e ver a lista na janela Mobis) para limpar o visual do quarto.",
        },
        {
          title: "Aba Renderização",
          description:
            "Novo atalho no painel para opções de desenho do quarto, inclusive o modo de canvas incremental.",
        },
      ],
    },
    {
      title: "Melhorado",
      items: [
        {
          title: "Mute geral mais estável",
          description:
            "Esconder ou mostrar avatares mutados e os balões de mute ficaram mais previsíveis no dia a dia.",
        },
        {
          title: "Janelas dentro da tela",
          description:
            "Painel, logs, links e chat respeitam melhor as bordas da janela do hotel ao arrastar ou redimensionar.",
        },
        {
          title: "Logs mais legíveis",
          description:
            "A janela de logs e os toasts ficaram mais claros para acompanhar cliques, sussurros e entrada ou saída de pessoas.",
        },
        {
          title: "Figuras e perfis",
          description:
            "Avatares e atalhos de perfil em várias partes da UI carregam e respondem de forma mais consistente.",
        },
        {
          title: "Respeitos no chat",
          description:
            "Agrupamento e apresentação de respeitos no chat do hotel ficaram mais suaves e menos invasivos.",
        },
        {
          title: "Instalação no navegador",
          description:
            "O guia de instalação explica como ativar Allow user scripts no Tampermonkey, passo comum quando o script não inicia.",
        },
      ],
    },
    {
      title: "Corrigido",
      items: [
        {
          title: "Fila de sussurros",
          description:
            "Envio e ritmo de mensagens privadas ficaram mais estáveis em conversas longas ou com várias abas.",
        },
        {
          title: "Grupos nativos",
          description:
            "Limpar ou gerenciar grupo de sussurro no Habblet interfere menos no que o Luminus mostra nas suas abas.",
        },
        {
          title: "Estado ao trocar de quarto",
          description:
            "Mute, logs de quarto e partes da UI reiniciam de forma mais correta quando você muda de sala.",
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
