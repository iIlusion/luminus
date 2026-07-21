<p align="center">
  <img src="luminus-logo.svg" alt="Luminus" width="96" height="96" />
</p>

<h1 align="center">Luminus</h1>

<p align="center">
  <strong>Userscript para o Habblet Hotel</strong><br />
  Painel flutuante com ferramentas de player, logs, visual, links e mute local.
</p>

<p align="center">
  <a href="https://github.com/iIlusion/luminus/releases"><img src="https://img.shields.io/github/v/release/iIlusion/luminus?include_prereleases&style=flat-square&label=release" alt="Release" /></a>
  <a href="https://github.com/iIlusion/luminus/commits/main"><img src="https://img.shields.io/github/last-commit/iIlusion/luminus?style=flat-square" alt="Last commit" /></a>
  <a href="https://github.com/iIlusion/luminus/stargazers"><img src="https://img.shields.io/github/stars/iIlusion/luminus?style=flat-square" alt="Stars" /></a>
  <a href="https://discord.gg/g5BYdnxcnS"><img src="https://img.shields.io/discord/000000000000000000?style=flat-square&logo=discord&label=Discord&color=5865F2" alt="Discord" /></a>
  <img src="https://img.shields.io/badge/Habblet-Hotel-7c5cff?style=flat-square" alt="Habblet" />
  <img src="https://img.shields.io/badge/Tampermonkey-userscript-black?style=flat-square&logo=tampermonkey" alt="Tampermonkey" />
  <img src="https://img.shields.io/badge/TypeScript-Vite-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="#instalação">Instalação</a> ·
  <a href="#como-o-script-funciona">Como funciona</a> ·
  <a href="#funcionalidades">Funcionalidades</a> ·
  <a href="#como-usar">Como usar</a> ·
  <a href="#api-windowluminus">API</a> ·
  <a href="#desenvolvimento">Desenvolvimento</a> ·
  <a href="#suporte">Suporte</a>
</p>

---

## O que é

O **Luminus** é um userscript que roda no navegador junto com o [Habblet Hotel](https://www.habblet.city/hotel).  
Ele adiciona um painel flutuante e utilitários que melhoram o dia a dia no hotel — sem instalar programa no PC: só o [Tampermonkey](https://www.tampermonkey.net/) (ou gerenciador de userscripts compatível).

> **Requisito:** conta no Habblet e extensão Tampermonkey (Chrome, Edge, Brave, Firefox, etc.).

O Luminus **não é oficial** e não é afiliado ao Habblet. Use por sua conta e risco e respeite as regras do hotel.

---

## Instalação

### 1. Instale o Tampermonkey

| Navegador | Link |
|-----------|------|
| Chrome / Brave / Edge | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |

Confirme que o ícone do Tampermonkey aparece na barra do navegador.

### 2. Instale o Luminus

**Opção A — a partir do GitHub (recomendada)**

1. Abra a [última release](https://github.com/iIlusion/luminus/releases/latest) **ou** o arquivo de build no repositório:
   - Produção: [`dist/luminus.user.js`](https://github.com/iIlusion/luminus/blob/main/dist/luminus.user.js)  
     (se o `dist/` estiver no branch; caso contrário use a release)
2. Clique em **Raw** (texto puro do script).
3. O Tampermonkey deve abrir a tela de instalação → **Instalar**.

**Opção B — arquivo local**

1. Baixe o `luminus.user.js` da release.
2. Abra o dashboard do Tampermonkey → **Utilitários** → **Importar** (ou arraste o arquivo).
3. Confirme a instalação.

### 3. Abra o hotel

1. Acesse [https://www.habblet.city/hotel](https://www.habblet.city/hotel) e entre na sua conta.
2. O Luminus inicia junto com a página (`@run-at document-start`).
3. Procure o **ícone / painel do Luminus** na interface, ou use o menu do Tampermonkey.

Se nada aparecer: confira se o script está **ativado** no Tampermonkey e se o `@match` inclui `habblet.city/hotel`.

---

## Como o script funciona

Visão geral em alto nível — útil para jogadores curiosos e para quem for contribuir.

```text
  Página do Habblet
        │
        ▼
  Tampermonkey injeta luminus.user.js (document-start)
        │
        ├─► intercepta WebSocket (mensagens do hotel)
        │         │
        │         ▼
        │   PacketBridge
        │     • decodifica pacotes binários (protocolo Eva)
        │     • normaliza headers (offsets Habblet por sessão)
        │     • parsers registrados → estado do quarto / você
        │     • handlers (mute local, logs, respeito, UI…)
        │
        ├─► window.Luminus  (API pública no console / código)
        │
        └─► UI React (painel, logs, links, estilos)
```

### Fluxo resumido

1. **Injeção cedo** — o script sobe antes do cliente do hotel, para envolver o `WebSocket` original.
2. **Interceptação** — cada frame binário que entra ou sai passa pelo `PacketBridge`.
3. **Codec + headers** — o Habblet usa headers “de fio” com **offset de sessão**. O Luminus descobre o offset e trabalha com **headers lógicos** estáveis no código (ex.: chat, usuários, ignore).
4. **Parsers / composers** — pacotes importantes têm parser (entrada) ou composer (saída). Falhas de parse são suaves: o restante do script continua.
5. **Estado do quarto** — unidades (avatares), você (`myself`), móveis e eventos alimentam o `roomStore` e as features.
6. **UI e preferências** — o painel lê/grava toggles (localStorage / `GM_setValue`), sem servidor do Luminus para as funções principais.

### O que *não* é

- Não é um client alternativo do hotel.
- Não grava senha nem substitui o login do Habblet.
- Mute “geral” e vários bloqueios de ação são **locais no seu cliente** (você deixa de ver/enviar certas coisas), não um ban no servidor.

---

## Funcionalidades

### Painel flutuante

Janela arrastável com abas:

| Aba | Função |
|-----|--------|
| **Player** | Avatar, mute, copiar visual, spam click |
| **Logs** | Chat / amigos / quarto → webhooks e histórico local |
| **Visual** | Vidro na UI, rádio, guarda-roupa |
| **Links** | Histórico de links de missões e perfis |

Builds de **desenvolvimento** podem expor abas **Packets** e **Debug** (só com modo dev ligado).

---

### Player

| Função | Descrição |
|--------|-----------|
| **Anti-Idle** | Quando o servidor marca você como ausente, o script reage para evitar idle indesejado |
| **Anti-Caminhar** | Bloqueia o envio de caminhadas (mesmo clicando no chão) |
| **Anti-Girar** | Impede mudanças de direção enviadas pelo cliente |
| **Anti-Digitando** | Não envia o indicador de “está digitando” |
| **Bloquear clique** | Impede cliques acidentais em outros jogadores; opção **Ctrl + clique** libera |
| **Ctrl + setas** | Gira o avatar com o teclado |
| **Copiar visual** | Clica em alguém (ou digita o nick) e aplica a figura no seu avatar |
| **Spam click** | Clique automático em um alvo (nick travável; opção de mudar alvo ao clicar) |
| **Mutar geral** | Silencia o **chat local** de todo o quarto no *seu* cliente |
| ↳ Whitelist | Nicks que nunca são mutados pelo mute geral |
| ↳ Esconder avatares | Oculta sprites dos mutados (sem mutar/esconder você mesmo) |
| ↳ Mutes manuais | Calar/ouvir por pessoa; **permanecem** entre sessões/quartos |
| ↳ Mute geral | **Não** persiste em reload nem troca de quarto |
| **Calar / Ouvir Habblet** | Atalhos no menu nativo / infostand (além do mute local) |

### Logs

| Função | Descrição |
|--------|-----------|
| **Chat log** | Cliques e sussurros (e filtros) para webhook Discord opcional |
| **Friend log** | Amigos online / mudança de quarto |
| **Room monitor** | Quem entrou/saiu e tempo no quarto |
| **Nicks monitorados** | Lista dedicada + atalhos para logs e links salvos |
| **Janela de logs** | Histórico local com tipos (click, sussurro, amigo, entrou, saiu) |

### Visual

| Função | Descrição |
|--------|-----------|
| **Interface em vidro** | Efeito glass por área (toolbar, menus, bolsa, etc.) |
| **Rádio** | Mostrar ou ocultar o player de rádio da página |
| **Guarda-roupa** | Layout horizontal / empilhado |

### Links

| Função | Descrição |
|--------|-----------|
| **Histórico** | Guarda links de missões e perfis que você abre |
| **Favoritos** | Marca links importantes |
| **Busca e filtros** | Por gênero e texto |
| **Vários links** | Contas com mais de um link |
| **Link duplicado** | Mesmo URL em duas ou mais contas |
| **Bloqueados / Não abertos** | Filtros de organização |
| **Abrir perfil** | Atalho para o perfil Habblet a partir do nick |

### Chat e UI do hotel

| Função | Descrição |
|--------|-----------|
| **Respeitos agrupados** | Mensagens de respeito empilhadas numa bolha com contador (sem “empurrar” o chat) |
| **Ícones no menu** | Link / olho / bloqueado no infostand e menu por nome |
| **Remoção de anúncios** | Tenta remover blocos de ads invasivos da página do hotel |

---

## Como usar

1. Entre no hotel com o Luminus ativo.  
2. Abra o painel e escolha a aba.  
3. Preferências ficam no navegador (localStorage / armazenamento do Tampermonkey).  
4. **Links** e **mutes manuais** persistem entre sessões.  
5. **Mutar geral** não sobrevive a F5 nem a troca de quarto (por design).

### Dicas

- Whitelist no mute geral: coloque amigos que você sempre quer ouvir.  
- Spam click com nick travado evita retarget acidental no meio do uso.  
- Webhooks de log são opcionais: só enviam se você configurar a URL.

### Arquivos de build

| Arquivo | Uso |
|---------|-----|
| `dist/luminus.user.js` | **Produção** — use este no dia a dia |
| `dist/luminus-dev.user.js` | Desenvolvimento (menu de debug, ferramentas extras) |

---

## Atualizações

1. Acompanhe as [**Releases**](https://github.com/iIlusion/luminus/releases).  
2. Baixe o novo `luminus.user.js` **ou** abra o Raw de novo e reinstale (o Tampermonkey pergunta se deseja atualizar).  
3. Se `@updateURL` / `@downloadURL` apontarem para a release, o Tampermonkey pode oferecer atualização automática.

**Versão:** badge de release no topo desta página, ou campo `@version` no cabeçalho do userscript.

---

## API `window.Luminus`

Com o hotel aberto e o script ativo, o console do navegador expõe a API (nomes estáveis para automação e debug):

| Área | Exemplos |
|------|----------|
| **Identidade** | `Luminus.myself` — seu usuário na sessão |
| **Quarto** | `Luminus.room` — unidades, estado derivado dos packets |
| **Envio** | `Luminus.send(composer)` — preferir composers tipados |
| **Eventos** | `Luminus.onIncoming(header, fn)`, `onOutgoing`, `onPacket` |
| **Bloqueio** | `Luminus.blockIncoming` / `blockOutgoing` (ex.: anti-caminhar) |
| **Figura** | `Luminus.setFigure(gender, figure)` |
| **Mute** | `Luminus.muteAll?.setEnabled(true)`, whitelist, hide avatars |
| **Debug** | `Luminus.debug.setEnabled(true)`, `toggleDevMode()` |
| **Composers** | `Luminus.composers.RoomUnitWalk`, `UserIgnore`, etc. |

> **Convenção:** não envie headers numéricos “soltos” se existir composer/parser. Headers de sessão mudam; o código usa headers **lógicos** após offset.

---

## Desenvolvimento

Quer contribuir? Leia esta seção antes de abrir um PR.

### Requisitos

- **Node.js** 20+ (LTS recomendado)  
- **npm** 10+  
- Git  
- Tampermonkey para testar no hotel  

### Setup

```bash
git clone https://github.com/iIlusion/luminus.git
cd luminus
npm install
```

### Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Watch da build de desenvolvimento (`luminus-dev.user.js`) |
| `npm run build` | Build produção + dev |
| `npm run build:main` | Só produção (`luminus.user.js`) |
| `npm run build:main-dev` | Só dev |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run release` | Typecheck + build de **produção** (manual) |
| `npm run release:full` | Typecheck + produção + dev (manual) |

Não há publish automático obrigatório: **release é intencional** (`npm run release`).

### Como testar no hotel

1. Rode `npm run dev` (ou `npm run release` para produção).  
2. No Tampermonkey, instale/aponte para o arquivo em `dist/`.  
3. Recarregue `https://www.habblet.city/hotel`.  
4. Valide no console: `window.Luminus` deve existir.  
5. Para abas Packets/Debug: use o menu do Tampermonkey (build dev) ou `Luminus.toggleDevMode()` e recarregue.

### Estrutura do repositório

```text
src/
  main.ts              # entrada do userscript
  version.ts           # versão injetada no build
  ws/
    interceptWebSocket.ts   # wrapper do WebSocket
    PacketBridge.ts         # decode, handlers, room, send
    api.ts                  # window.Luminus
  protocol/
    codec.ts, binary.ts     # leitura/escrita Eva
    headerOffsets.ts        # offset de sessão Habblet
    IncomingHeader.ts / OutgoingHeader.ts
  messages/
    registerParsers.ts      # registro de headers
    incoming/*Parser.ts
    outgoing/*Composer.ts
  room/
    roomStore.ts            # unidades / furnis / resets
    muteAll.ts              # mute local + hide
  ui/
    inject.ts, panel.tsx    # montagem e painel
    linkWindow.tsx, logWindow.tsx
    respectMessages.ts, infostandLinks.ts
    toolbarGlass.ts, styles.ts
  links/                    # store de links de missões
  logs/                     # handlers e store de logs
  util/                     # prefs, fetch, timers
  bridge/                   # capturas opcionais (dev)
  build/                    # stubs de build
dist/                       # bundles .user.js gerados
```

### Arquitetura para contribuidores

| Módulo | Responsabilidade |
|--------|------------------|
| `interceptWebSocket` | Substitui `WebSocket` e encaminha frames ao bridge |
| `PacketBridge` | Pipeline de decode, registry, room state, block/send |
| `registerParsers` | Fonte de verdade: quais headers têm parser/composer |
| `roomStore` / `muteAll` | Estado do quarto e mute **local** |
| `ui/*` | React + CSS injetado; não deve travar o cliente do hotel |
| `prefs` | Persistência de preferências |

### Convenções de código

- TypeScript strict, **2 espaços**, aspas **duplas**, ponto e vírgula  
- Nomes explícitos: `FurnitureFloorParser`, `PacketBridge`, `UserIgnoreComposer`  
- Headers: sempre **lógicos** pós-offset — não hardcodar wire headers de uma sessão  
- Pacotes novos: criar parser/composer e registrar em `registerParsers.ts`  
- Parse deve falhar de forma isolada (log continua)  
- Evite abstrações especulativas; helpers só quando reduzem duplicação real  
- UI: não faça `MutationObserver` sem filtro — loops travam a página  

### Checklist de PR

1. Fork + branch a partir de `main`  
2. Mudança focada (uma feature / um bug)  
3. `npm run typecheck` e `npm run release` (ou `build`) passam  
4. Descreva o que o **jogador** ganha (PT ou EN)  
5. Não commite `node_modules/`, dumps de packets sensíveis, tokens ou webhooks  

### Segurança e privacidade

- O script roda **no seu navegador** e só na sessão do hotel (`@match` Habblet).  
- Webhooks de log são opcionais e configurados por você.  
- Não compartilhe prints com tokens, webhooks ou dados de terceiros em issues públicas.  
- Capturas de packets para debug: mantenha locais; não suba dumps com dados pessoais.

### Roadmap de contribuição (ideias)

- Novos parsers com fixtures de packet (JSON local)  
- Melhorias de acessibilidade no painel  
- Documentação de um fluxo de feature com captura antes/depois  
- Testes unitários leves (Node + strip-types) para parsers e utilitários  

---

## Suporte

- **Discord:** [entrar no servidor](https://discord.gg/g5BYdnxcnS)  
- **Issues:** [GitHub Issues](https://github.com/iIlusion/luminus/issues)  
- **Releases:** [github.com/iIlusion/luminus/releases](https://github.com/iIlusion/luminus/releases)

---

## Aviso

O Luminus é um projeto da comunidade, **não oficial** e não afiliado ao Habblet Hotel.  
Use por sua conta e risco e respeite as regras do hotel.

---

## Licença

Consulte o repositório para a licença aplicável ao código. Contribuições assumem os mesmos termos, salvo indicação em contrário.
