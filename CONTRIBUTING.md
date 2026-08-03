# Contribuindo com o Luminus

Este guia é para **pessoas** que alteram o código.  
Jogadores: veja o `README.md`.  
Agentes de código: veja o `AGENTS.md`.

Texto em **português do Brasil (PT-BR)**.

---

## 1. Requisitos

- Node.js 20+ (LTS recomendado)
- npm 10+
- Git
- Tampermonkey para testar no hotel

---

## 2. Setup

1. Clone o repositório.
2. Entre na pasta do projeto.
3. Use a branch **`dev`** (trabalho diário).
4. Instale as dependências.

```bash
git clone https://github.com/iIlusion/luminus.git
cd luminus
git checkout dev
npm install
```

**NOTA:** A branch `main` guarda só releases estáveis. Não desenvolva em `main`.

---

## 3. Branches e release

| Branch | Função |
|--------|--------|
| **`dev`** | Desenvolvimento contínuo. Commits e PRs de feature/fix. |
| **`main`** | Releases finais. Atualiza quando `dev` está estável. |

### Fluxo diário

1. Atualize `dev`: `git pull origin dev`.
2. Faça a mudança em uma branch a partir de `dev` (ou direto em `dev`, se combinado).
3. Abra PR para **`dev`**, se o fluxo do time usar PR por feature.
4. Peça review e merge em `dev`.

### Fluxo de release pública

1. Confirme que `dev` está estável (`npm run typecheck` e `npm run release`).
2. Abra PR **`dev` → `main`**.
3. Após o merge, publique tag/release no GitHub se for o caso.
4. Volte a trabalhar em `dev`. Se precisar, mescle `main` em `dev`.

---

## 4. Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Watch da build de desenvolvimento |
| `npm run build` | Build de produção e de desenvolvimento |
| `npm run build:main` | Só `dist/luminus.user.js` |
| `npm run build:main-dev` | Só `dist/luminus-dev.user.js` |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run release` | Typecheck + build de produção |
| `npm run release:full` | Typecheck + produção + dev |

Release de build é **manual e intencional**.

---

## 5. Como testar no hotel

1. Rode `npm run dev` (ou `npm run release` para produção).
2. No Tampermonkey, instale ou atualize o arquivo em `dist/`.
3. Abra `https://www.habblet.city/hotel` e entre na conta.
4. Confirme no console: `window.Luminus` existe.
5. Para abas Packets/Debug: use a build dev e o menu do Tampermonkey, ou `Luminus.toggleDevMode()` e recarregue.

---

## 6. Estrutura do repositório

```text
src/
  main.ts                 # entrada do userscript
  boot/bootLuminus.ts     # boot ordenado
  ws/                     # WebSocket, PacketBridge, API
  protocol/               # codec e headers
  messages/               # parsers e composers
  room/                   # estado do quarto e mute local
  ui/                     # painel e janelas
  logs/                   # logs e webhooks opcionais
  links/                  # histórico de links
  chat/                   # chat e sussurros
  util/                   # prefs e utilitários
dist/                     # bundles .user.js gerados
```

| Módulo | Responsabilidade |
|--------|------------------|
| `interceptWebSocket` | Envolve o `WebSocket` e envia frames ao bridge |
| `PacketBridge` | Decode, registry, estado, block e send |
| `registerParsers` | Headers com parser/composer |
| `roomStore` / `muteAll` | Estado do quarto e mute local |
| `ui/*` | React e CSS injetados |
| `prefs` | Preferências persistidas |

---

## 7. Convenções de código

- TypeScript strict, **2 espaços**, aspas **duplas**, ponto e vírgula.
- Nomes explícitos: `FurnitureFloorParser`, `PacketBridge`, `UserIgnoreComposer`.
- Headers no código: **lógicos** após offset Habblet. Não fixe wire headers de uma sessão.
- Pacote novo: crie parser ou composer e registre em `registerParsers.ts`.
- Parse falha de forma isolada. O restante do script continua.
- Evite abstrações especulativas.
- UI: não use `MutationObserver` sem filtro.

### Packets

- Prefira `api.send(new FooComposer(...))`.
- Não envie header numérico cru se existir composer.

---

## 8. Mensagens de commit (PT-BR)

Use português do Brasil. Explique o **quê** e o **porquê**.

```text
corrige anti-idle após troca de quarto

Reinicia o estado ao receber RoomReady para não reagir ao quarto antigo.
```

Evite mensagens vagas (`fix`, `updates`, `wip`).

---

## 9. Checklist de PR

1. Trabalho baseado em **`dev`** (não em `main`, salvo release).
2. Mudança focada (uma feature ou um bug).
3. `npm run typecheck` passa.
4. `npm run release` (ou `build`) passa.
5. Descreva o ganho para o jogador, quando houver.
6. Não inclua `node_modules/`, dumps sensíveis, tokens ou webhooks.

**CUIDADO:** Não commite dados pessoais capturados em packets.

---

## 10. Segurança e privacidade

- O script roda no navegador do usuário, na página do hotel.
- Webhooks de log são opcionais e configurados pelo usuário.
- Não publique tokens, webhooks ou dados de terceiros em issues.
- Mantenha capturas de packet locais.

---

## 11. Ideias de contribuição

- Novos parsers com fixtures locais de packet
- Acessibilidade no painel
- Testes unitários leves (Node + strip-types) para parsers e utilitários
- Documentação de um fluxo de feature com captura antes/depois

---

## Suporte para contribuidores

- Discord: https://discord.gg/HmVkadXGVz  
- Issues: https://github.com/iIlusion/luminus/issues  
