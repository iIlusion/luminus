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
  title: "Luminus 1.0 — mute, respeitos e links",
  summary: "Primeira versão pública major: silencie o quarto, organize o chat de respeitos e filtre links com mais controle.",
  publishedAt: "21 de julho de 2026",
  sections: [
    {
      title: "Player",
      items: [
        {
          title: "Mutar geral",
          description: "Na aba Player, silencie o chat de todo o quarto só no seu cliente. Use a lista branca para quem você sempre quer ouvir e a opção de esconder os avatares mutados."
        },
        {
          title: "Calar e ouvir no menu",
          description: "No menu do jogador e no infostand você pode calar ou voltar a ouvir alguém com um clique. Mutes manuais ficam salvos; o mutar geral não permanece após trocar de quarto ou recarregar."
        },
        {
          title: "Você nunca some",
          description: "Seu próprio avatar e suas mensagens não entram no mute nem no esconder, para você não se perder no quarto."
        }
      ]
    },
    {
      title: "Chat",
      items: [
        {
          title: "Respeitos agrupados",
          description: "Vários respeitos viram uma bolha com contador, sem empurrar o restante do chat e sem deixar espaços vazios."
        },
        {
          title: "Sempre no fim da conversa",
          description: "Quando chegam novos respeitos, o agrupamento continua na mensagem mais recente, fácil de achar no final do chat."
        },
        {
          title: "Nome de quem recebeu",
          description: "O agrupamento mostra corretamente o jogador que recebeu o respeito."
        }
      ]
    },
    {
      title: "Links",
      items: [
        {
          title: "Filtros novos",
          description: "No Menu de Links: vários links na mesma conta, link duplicado entre contas, bloqueados, favoritos e ainda não abertos."
        },
        {
          title: "Perfis a partir de placares e logs",
          description: "Nomes em placares de pontuação e na janela de logs abrem o perfil do Habblet com um clique."
        }
      ]
    },
    {
      title: "Visual e painel",
      items: [
        {
          title: "Vidro por área",
          description: "Na aba Visual, ligue o efeito de vidro só nas partes da interface que quiser."
        },
        {
          title: "Opções aninhadas",
          description: "Configurações extras ficam sob o item principal, com menos poluição no painel."
        },
        {
          title: "Bolsa e logs mais estáveis",
          description: "A bolsa colapsável ficou mais legível e a aba de Logs não estoura o layout em telas menores."
        },
        {
          title: "Ícones no menu do jogador",
          description: "Link, olho e bloqueado aparecem no menu por nome e no infostand para saber o estado de cada pessoa."
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
