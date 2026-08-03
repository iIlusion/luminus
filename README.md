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
  <a href="https://github.com/iIlusion/luminus/commits/main"><img src="https://img.shields.io/github/last-commit/iIlusion/luminus/main?style=flat-square" alt="Last commit" /></a>
  <a href="https://github.com/iIlusion/luminus/stargazers"><img src="https://img.shields.io/github/stars/iIlusion/luminus?style=flat-square" alt="Stars" /></a>
  <a href="https://discord.gg/HmVkadXGVz"><img src="https://img.shields.io/discord/1476244054126891072?style=flat-square&logo=discord&label=Discord&color=5865F2" alt="Discord" /></a>
  <img src="https://img.shields.io/badge/Habblet-Hotel-7c5cff?style=flat-square" alt="Habblet" />
  <img src="https://img.shields.io/badge/Tampermonkey-userscript-black?style=flat-square&logo=tampermonkey" alt="Tampermonkey" />
  <img src="https://img.shields.io/badge/TypeScript-Vite-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">
  <a href="#identificação">Identificação</a> ·
  <a href="#instalação">Instalação</a> ·
  <a href="#operação">Operação</a> ·
  <a href="#princípio-de-funcionamento">Funcionamento</a> ·
  <a href="#api-windowluminus">API</a> ·
  <a href="#atualizações">Atualizações</a> ·
  <a href="#suporte">Suporte</a>
</p>

---

## Identificação

O **Luminus** é um userscript. Ele roda no navegador junto com o [Habblet Hotel](https://www.habblet.city/hotel).

O Luminus adiciona um painel flutuante e utilitários de uso diário no hotel. Você não instala um programa no PC. Você usa o [Tampermonkey](https://www.tampermonkey.net/) (ou um gerenciador de userscripts compatível).

| Item | Valor |
|------|--------|
| Nome | Luminus |
| Tipo | Userscript (Tampermonkey) |
| Alvo | `https://www.habblet.city/hotel*` |
| Build de uso | `luminus.user.js` (produção) |

**Requisito:** conta no Habblet e extensão Tampermonkey (Chrome, Edge, Brave, Firefox ou similar).

> **AVISO:** O Luminus **não é oficial** e não é afiliado ao Habblet. Use por sua conta e risco. Respeite as regras do hotel.

---

## Instalação

### 1. Instale o Tampermonkey

| Navegador | Link |
|-----------|------|
| Chrome / Brave / Edge | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |

1. Instale a extensão.
2. Confirme o ícone do Tampermonkey na barra do navegador.
3. Ative **Allow User Scripts** (Permitir scripts de usuário) nas configurações do Tampermonkey.
   - Abra o dashboard do Tampermonkey → **Configurações**.
   - Ligue a opção **Allow User Scripts**.
   - Em vários navegadores (sobretudo Chrome e afins) essa opção é **obrigatória** para o script rodar.
   - Detalhes oficiais: [FAQ do Tampermonkey — Q209](https://www.tampermonkey.net/faq.php?locale=en&q=Q209).

**CUIDADO:** Sem **Allow User Scripts** ativo, o Luminus pode instalar e ainda assim **não executar** na página do hotel.

### 2. Instale o Luminus

**Opção A — GitHub (recomendada)**

1. Abra a [última release](https://github.com/iIlusion/luminus/releases/latest).
2. Baixe ou abra o `luminus.user.js` da release.  
   Se o repositório publicar o arquivo no branch `main`, você também pode usar o [Raw](https://github.com/iIlusion/luminus/blob/main/dist/luminus.user.js) de `dist/luminus.user.js` quando existir.
3. O Tampermonkey abre a tela de instalação.
4. Clique em **Instalar**.

**Opção B — arquivo local**

1. Baixe o `luminus.user.js` da release.
2. Abra o dashboard do Tampermonkey.
3. Use **Utilitários** → **Importar** (ou arraste o arquivo).
4. Confirme a instalação.

### 3. Abra o hotel

1. Acesse [https://www.habblet.city/hotel](https://www.habblet.city/hotel).
2. Entre na sua conta.
3. O Luminus inicia com a página (`@run-at document-start`).
4. Abra o painel pelo ícone na interface ou pelo menu do Tampermonkey.

**NOTA:** Se nada aparecer:

1. Confirme que o script está **ativado** no Tampermonkey.
2. Confirme que **Allow User Scripts** está ligado (veja o passo 3 da instalação da extensão e o [FAQ Q209](https://www.tampermonkey.net/faq.php?locale=en&q=Q209)).
3. Confira se o `@match` inclui `habblet.city/hotel`.

---

## Operação

### Como usar

1. Entre no hotel com o Luminus ativo.
2. Abra o painel e escolha a aba.
3. Ajuste as preferências. Elas ficam no navegador (localStorage / armazenamento do Tampermonkey).
4. Links salvos e mutes manuais permanecem entre sessões.
5. **Mutar geral** não permanece após F5 nem após troca de quarto.

### Painel flutuante

Janela arrastável com abas:

| Aba | Função |
|-----|--------|
| **Player** | Avatar, mute, copiar visual, spam click |
| **Logs** | Chat, amigos e quarto; webhooks e histórico local |
| **Visual** | Vidro na UI, rádio, guarda-roupa |
| **Links** | Histórico de links de missões e perfis |

Builds de **desenvolvimento** podem mostrar abas **Packets** e **Debug** quando o modo dev está ligado.

### Player

| Função | Descrição |
|--------|-----------|
| **Anti-Idle** | Reage quando o servidor marca você como ausente |
| **Anti-Caminhar** | Bloqueia o envio de caminhadas |
| **Anti-Girar** | Impede mudanças de direção enviadas pelo cliente |
| **Anti-Digitando** | Não envia o indicador de digitação |
| **Bloquear clique** | Impede cliques acidentais em outros jogadores; **Ctrl + clique** libera |
| **Ctrl + setas** | Gira o avatar com o teclado |
| **Copiar visual** | Copia a figura de outro nick para o seu avatar |
| **Spam click** | Clique automático em um alvo (nick travável) |
| **Mutar geral** | Silencia o chat local do quarto **no seu cliente** |
| ↳ Whitelist | Nicks que o mute geral não silencia |
| ↳ Esconder avatares | Oculta sprites dos mutados (não afeta você) |
| ↳ Mutes manuais | Calar ou ouvir por pessoa; **permanecem** entre sessões |
| ↳ Mute geral | **Não** permanece em reload nem em troca de quarto |
| **Calar / Ouvir Habblet** | Atalhos no menu nativo e no infostand |

**NOTA:** Mute geral e vários bloqueios de ação são **locais**. Eles não banem ninguém no servidor.

### Logs

| Função | Descrição |
|--------|-----------|
| **Chat log** | Cliques e sussurros para webhook Discord opcional |
| **Friend log** | Amigos online e mudança de quarto |
| **Room monitor** | Quem entrou ou saiu e o tempo no quarto |
| **Nicks monitorados** | Lista dedicada e atalhos |
| **Janela de logs** | Histórico local por tipo |

### Visual

| Função | Descrição |
|--------|-----------|
| **Interface em vidro** | Efeito glass por área da UI |
| **Rádio** | Mostra ou oculta o player de rádio da página |
| **Guarda-roupa** | Layout horizontal ou empilhado |

### Links

| Função | Descrição |
|--------|-----------|
| **Histórico** | Guarda links de missões e perfis que você abre |
| **Favoritos** | Marca links importantes |
| **Busca e filtros** | Por gênero e texto |
| **Vários links / duplicados** | Organização por conta e URL |
| **Bloqueados / Não abertos** | Filtros de organização |
| **Abrir perfil** | Atalho de perfil a partir do nick |

### Chat e UI do hotel

| Função | Descrição |
|--------|-----------|
| **Respeitos agrupados** | Respeitos empilhados numa bolha com contador |
| **Ícones no menu** | Link, olho e bloqueado no infostand e no menu por nome |
| **Remoção de anúncios** | Tenta remover blocos de ads invasivos da página |

### Dicas

- Coloque amigos na whitelist do mute geral se você sempre quer ouvi-los.
- Use spam click com nick travado para evitar troca acidental de alvo.
- Webhooks de log são opcionais. Só enviam dados se você configurar a URL.

### Arquivos de build

| Arquivo | Uso |
|---------|-----|
| `dist/luminus.user.js` | **Produção** — uso diário |
| `dist/luminus-dev.user.js` | Desenvolvimento (menu de debug e extras) |

Para contribuir com código, veja [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Princípio de funcionamento

Visão geral em alto nível.

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
        │     • decodifica pacotes binários
        │     • normaliza headers (offset de sessão)
        │     • parsers → estado do quarto e de você
        │     • handlers (mute local, logs, UI, …)
        │
        ├─► window.Luminus  (API no console)
        │
        └─► UI React (painel, logs, links)
```

### Fluxo

1. O script sobe **antes** do cliente do hotel e envolve o `WebSocket`.
2. Cada frame binário de entrada ou saída passa pelo `PacketBridge`.
3. O Habblet usa headers de fio com **offset de sessão**. O Luminus descobre o offset e usa **headers lógicos** no código.
4. Pacotes importantes têm parser (entrada) ou composer (saída). Falha de parse é isolada.
5. O estado do quarto (avatares, você, móveis) alimenta as funções.
6. O painel grava preferências no navegador. As funções principais não dependem de servidor do Luminus.

### O que o Luminus não é

- Não é um client alternativo do hotel.
- Não grava senha e não substitui o login do Habblet.
- Não aplica ban ou punição no servidor do hotel.

---

## API `window.Luminus`

Com o hotel aberto e o script ativo, o console do navegador expõe a API:

| Área | Exemplos |
|------|----------|
| **Identidade** | `Luminus.myself` |
| **Quarto** | `Luminus.room` |
| **Envio** | `Luminus.send(composer)` — prefira composers tipados |
| **Eventos** | `Luminus.onIncoming(header, fn)`, `onOutgoing`, `onPacket` |
| **Bloqueio** | `Luminus.blockIncoming` / `blockOutgoing` |
| **Figura** | `Luminus.setFigure(gender, figure)` |
| **Mute** | `Luminus.muteAll?.setEnabled(true)` |
| **Debug** | `Luminus.debug.setEnabled(true)`, `toggleDevMode()` |
| **Composers** | `Luminus.composers.RoomUnitWalk`, `UserIgnore`, etc. |

**NOTA:** Não envie headers numéricos soltos se existir composer. Headers de sessão mudam. O código usa headers **lógicos** após o offset.

---

## Atualizações

1. Acompanhe as [Releases](https://github.com/iIlusion/luminus/releases).
2. Baixe o novo `luminus.user.js` ou abra o Raw e reinstale.
3. O Tampermonkey pergunta se deseja atualizar.
4. Se `@updateURL` / `@downloadURL` apontarem para a release, o Tampermonkey pode oferecer atualização automática.

**Versão:** badge de release no topo desta página, ou campo `@version` no cabeçalho do userscript.

---

## Suporte

| Canal | Link |
|-------|------|
| Discord | [Entrar no servidor](https://discord.gg/HmVkadXGVz) |
| Issues | [GitHub Issues](https://github.com/iIlusion/luminus/issues) |
| Releases | [github.com/iIlusion/luminus/releases](https://github.com/iIlusion/luminus/releases) |

---

## Aviso

O Luminus é um projeto da comunidade. Ele **não é oficial** e não é afiliado ao Habblet Hotel.

Use por sua conta e risco. Respeite as regras do hotel.

---

## Licença

Consulte o repositório para a licença do código. Contribuições usam os mesmos termos, salvo indicação em contrário.

---

## Documentação para desenvolvimento

| Documento | Público |
|-----------|---------|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Pessoas que contribuem com código |
| [`AGENTS.md`](AGENTS.md) | Agentes de código (automação) |
