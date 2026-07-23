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
  title: "Luminus 1.1 - historico privado, grupos e cliques",
  summary: "O chat privado ficou muito mais completo, os grupos pararam de misturar pessoas antigas e os avisos de clique ganharam mais contexto no jogo.",
  publishedAt: "23 de julho de 2026",
  sections: [
    {
      title: "Chat privado",
      items: [
        {
          title: "Historico de chat com abas",
          description: "Agora voce pode abrir conversas privadas em uma janela propria, com abas por pessoa ou grupo, busca por quem ja falou com voce e resposta direta sem depender de deixar o chat nativo aberto."
        },
        {
          title: "Grupos separados de verdade",
          description: "Limpar o texto de grupo no chat do Habblet agora tambem limpa os membros daquele grupo. Isso evita herdar pessoas antigas quando voce monta outro grupo diferente."
        },
        {
          title: "Mais controle nas conversas",
          description: "Cada aba mostra contador de novas mensagens, permite fechar so aquela conversa, apagar mensagens individuais, apagar o chat inteiro e limpar o grupo nativo com um clique."
        }
      ]
    },
    {
      title: "Cliques e avisos",
      items: [
        {
          title: "Ctrl + clique para revidar",
          description: "Segurando Ctrl ao clicar em nomes do Luminus, voce pode mandar o clique de volta sem depender do botao de spam click."
        },
        {
          title: "Aviso quando voce clica",
          description: "Quando o aviso estiver ligado, o quarto tambem mostra a mensagem de que voce clicou em alguem, no mesmo estilo visual das notificacoes ja vistas no jogo."
        },
        {
          title: "Clique repetido agrupado",
          description: "Mensagens de clique recebidas entram no historico da conversa e, quando a mesma pessoa clicar varias vezes, o contador sobe na propria mensagem."
        }
      ]
    },
    {
      title: "Links",
      items: [
        {
          title: "Filtros combinaveis",
          description: "A janela de Links agora deixa combinar varios filtros ao mesmo tempo, como duplicados, favoritos, bloqueados, varios links e ainda nao abertos."
        },
        {
          title: "Nomes mais uteis",
          description: "Cliques em nomes pela janela de Links e por partes do historico ficaram mais consistentes para abrir o perfil da pessoa com menos atrito."
        }
      ]
    },
    {
      title: "Player e painel",
      items: [
        {
          title: "Mute geral mais estavel",
          description: "O mute geral ficou mais previsivel ao esconder ou mostrar avatares, e voce pode escolher se quer ou nao ver os baloes de mute."
        },
        {
          title: "Antispam opcional no privado",
          description: "O antispam do historico privado agora fica desligado por padrao e tenta segurar menos as conversas quando voce alterna entre mensagens diferentes."
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
