# Luminus â€” notas para contribuidores

## Comandos

- `npm run dev` â€” watch `luminus-dev.user.js`
- `npm run release` â€” typecheck + build de produÃ§Ã£o
- `npm run typecheck`

## Estrutura

- `src/main.ts` â€” entrada
- `src/ws/` â€” WebSocket e `window.Luminus`
- `src/protocol/` â€” codec e headers
- `src/messages/` â€” parsers e composers
- `src/room/` â€” estado do quarto e mute local
- `src/ui/` â€” painel e janelas
- `src/links/`, `src/logs/` â€” links e logs

## Estilo

TypeScript strict, 2 espaÃ§os, aspas duplas, ponto e vÃ­rgula.  
Headers lÃ³gicos apÃ³s offset Habblet; parsers/composers para packets novos.
