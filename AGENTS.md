# AGENTS.md — Luminus

Instruções para **agentes de código** que editam este repositório.  
Guia do jogador: `README.md`.  
Guia de contribuição humana: `CONTRIBUTING.md`.

Idioma de commits e PRs: **português do Brasil (PT-BR)**.

---

## 1. Propósito deste repositório

O **Luminus** é um userscript TypeScript/Vite para o Habblet Hotel (`https://www.habblet.city/hotel*`).

| Item | Valor |
|------|--------|
| Entrada de produção | `src/main.ts` → `bootLuminus()` |
| API na página | `window.Luminus` (`src/ws/api.ts`) |
| Artefato principal | `dist/luminus.user.js` |
| Artefato de desenvolvimento | `dist/luminus-dev.user.js` |

O script:

1. Injeta cedo (`document-start`).
2. Intercepta o `WebSocket` do hotel.
3. Decodifica pacotes, atualiza estado e UI.
4. Expõe a API pública no console.

**Não** invente backend do Luminus, login alternativo nem mutação de estado no servidor do hotel. Mute e bloqueios de ação são **locais no cliente**.

---

## 2. Branches

| Branch | Uso |
|--------|-----|
| **`dev`** | Trabalho diário. Commits e push de features/fixes. |
| **`main`** | Só **releases estáveis**. Não faça commit de feature direto em `main`. |

Fluxo:

1. Trabalhe em `dev` (`git checkout dev`).
2. Quando o usuário pedir release: PR **`dev` → `main`**.
3. Após o merge, continue em `dev` (atualize com `main` se necessário).

Push e force-push: **somente** se o usuário pedir de forma explícita.

---

## 3. Mapa de `src/`

| Caminho | Quando editar |
|---------|----------------|
| `src/main.ts` | Entrada do userscript |
| `src/boot/bootLuminus.ts` | Ordem de boot (WS, logs, UI, mute, etc.) |
| `src/ws/interceptWebSocket.ts` | Wrapper do `WebSocket` |
| `src/ws/PacketBridge.ts` | Decode, handlers, room state, send/block |
| `src/ws/api.ts` | Superfície `window.Luminus` |
| `src/protocol/` | Codec binário, offsets de header, tipos |
| `src/messages/registerParsers.ts` | Registro de parsers e composers |
| `src/messages/incoming/*` | Parsers de pacotes de entrada |
| `src/messages/outgoing/*` | Composers de pacotes de saída |
| `src/room/roomStore.ts` | Unidades, móveis, reset de quarto |
| `src/room/muteAll.ts` | Mute local e hide de avatares |
| `src/room/furniClassHide.ts` | Ocultar classes de mobília |
| `src/ui/` | Painel React, janelas, estilos, inject |
| `src/logs/` | Handlers e store de logs |
| `src/links/` | Store de links de missão/perfil |
| `src/chat/` | Chat, sussurros, histórico de threads |
| `src/bridge/` | Capturas e MCP (builds com dev tools) |
| `src/util/` | Prefs, fetch GM, timers |
| `src/version.ts` | Versão injetada no build |
| `src/build/` | Stubs de build (ex.: sem MCP) |

Prefira a pasta que já concentra a feature. Não espalhe lógica de packet na UI.

---

## 4. Build e comandos

```bash
npm install
npm run typecheck
npm run dev          # watch → dist/luminus-dev.user.js
npm run build        # produção + dev
npm run build:main   # só luminus.user.js
npm run release      # typecheck + build de produção
```

| Comando | Saída |
|---------|--------|
| `build:main` / `release` | `dist/luminus.user.js` |
| `dev` / `build:main-dev` | `dist/luminus-dev.user.js` |

Teste no hotel:

1. Instale ou atualize o `.user.js` no Tampermonkey.
2. Recarregue `https://www.habblet.city/hotel`.
3. Confirme `window.Luminus` no console.

---

## 5. Regras de packets

1. **Não** chame `api.send` / `bridge.send` com header numérico cru se existir composer.
2. Use `api.send(new FooComposer(...))`.
3. Pacote de saída novo: crie composer em `src/messages/outgoing/` e registre em `registerParsers.ts`.
4. Pacote de entrada novo: crie parser em `src/messages/incoming/` e registre.
5. Headers no código são **lógicos** (pós-offset Habblet). Não fixe wire headers de uma sessão.
6. Parse deve falhar de forma isolada. Não derrube o bridge inteiro por um pacote.

Referência de registro: `src/messages/registerParsers.ts`.

---

## 6. Convenções de código

- TypeScript **strict**
- **2 espaços**, aspas **duplas**, ponto e vírgula
- Nomes explícitos: `FurnitureFloorParser`, `UserIgnoreComposer`, `PacketBridge`
- Helpers só quando removem duplicação real
- UI: evite `MutationObserver` sem filtro (trava a página)
- Prefs: `src/util/prefs.ts` (e `GM_*` quando já usado no fluxo)

---

## 7. Commits e PR (PT-BR)

Mensagens de commit em **português do Brasil**, completas e focadas:

```text
corrige mute local ao trocar de quarto

Limpa sessões ativas no RoomReady para não vazar nomes do quarto anterior.
```

Prefixos úteis (opcional): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

PR / trabalho diário:

- Base de feature: branch a partir de **`dev`**.
- Descreva o ganho para o jogador, quando houver.
- Não commite `node_modules/`, dumps de packets com dados pessoais, tokens ou webhooks.

Release:

- PR **`dev` → `main`** só quando o usuário pedir release.
- Não force-push em `main` sem pedido explícito.

---

## 8. Proibições

1. Não invente feature de servidor (ban, kick real, privilégio de staff).
2. Não trate mute/hide como efeito global no hotel — é **local no cliente**.
3. Não hardcode secrets, webhooks ou tokens no código.
4. Não suba capturas de packet com dados de terceiros.
5. Não reescreva histórico público (`main`/`dev`) sem pedido do usuário.
6. Não adicione dependências npm sem necessidade clara e alinhada ao projeto.
7. Não documente neste repo produtos ou packages que não existem neste tree.

---

## 9. Checklist antes de declarar pronto

- [ ] Branch correta (`dev` para trabalho normal)
- [ ] Mudança no módulo certo da tabela da secção 3
- [ ] Packets: composer/parser + registro, se aplicável
- [ ] `npm run typecheck` passa
- [ ] `npm run release` ou `build` passa, se a mudança afeta runtime
- [ ] Smoke mental: painel, WS, feature tocada
- [ ] Mensagem de commit em PT-BR
- [ ] Push só se o usuário pediu

---

## 10. Leitura rápida por tipo de tarefa

| Tarefa | Pastas principais |
|--------|-------------------|
| Novo packet | `messages/`, `protocol/`, `registerParsers.ts` |
| Mute / visibilidade | `room/muteAll.ts`, `room/furniClassHide.ts`, UI relacionada |
| Painel / preferência | `ui/panel.tsx`, `ui/styles.ts`, `util/prefs.ts` |
| Logs / webhooks | `logs/` |
| Chat / sussurro | `chat/`, parsers de chat |
| API pública | `ws/api.ts` |
| Boot / menu TM | `boot/bootLuminus.ts`, `ui/inject.ts` |
