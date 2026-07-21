import { readPref, writePref } from "./util/prefs";

export interface Changelog {
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

export function defineChangelog<const T extends Changelog>(changelog: T): T {
  return changelog;
}

export const CURRENT_CHANGELOG = defineChangelog({
  title: "Respeitos sempre à vista",
  summary: "As mensagens agrupadas agora acompanham o fim da conversa.",
  publishedAt: "16 de julho de 2026",
  sections: [
    {
      title: "Chat",
      items: [
        {
          title: "Última mensagem mantida",
          description: "Ao receber novos respeitos, o agrupamento permanece na mensagem mais recente para não ficar perdido acima na conversa."
        }
      ]
    }
  ]
});

const SEEN_CHANGELOG_KEY = "luminus.changelog.seenContent";

export function claimCurrentChangelog(): Changelog | null {
  const content = JSON.stringify(CURRENT_CHANGELOG);
  if (readPref(SEEN_CHANGELOG_KEY, "") === content) return null;
  writePref(SEEN_CHANGELOG_KEY, content);
  return CURRENT_CHANGELOG;
}
