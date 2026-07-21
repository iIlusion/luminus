# Luminus — notas para contribuidores

## Comandos

- `npm run dev` — watch `luminus-dev.user.js`
- `npm run release` — typecheck + build de produção
- `npm run typecheck`

## Estrutura

- `src/main.ts` — entrada
- `src/ws/` — WebSocket e `window.Luminus`
- `src/protocol/` — codec e headers
- `src/messages/` — parsers e composers
- `src/room/` — estado do quarto e mute local
- `src/ui/` — painel e janelas
- `src/links/`, `src/logs/` — links e logs

## Estilo

TypeScript strict, 2 espaços, aspas duplas, ponto e vírgula.  
Headers lógicos após offset Habblet; parsers/composers para packets novos.
