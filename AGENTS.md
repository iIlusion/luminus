# Luminus — notes for contributors

## Branches

| Branch | Purpose |
|--------|---------|
| **`main`** | Final stable releases only. Do not land everyday work here. |
| **`dev`** | Active development. Commit and open work against this branch. |

Release flow: when `dev` is stable, open a PR **`dev` → `main`**. After merge, tag/release from `main` if needed, then continue on `dev`.

## Commands

- `npm run dev` — watch `luminus-dev.user.js`
- `npm run release` — typecheck + production build
- `npm run typecheck`

## Structure

- `src/main.ts` — entry
- `src/ws/` — WebSocket and `window.Luminus`
- `src/protocol/` — codec and headers
- `src/messages/` — packet registries, parsers, composers
- `src/room/` — room state (units, furnis)
- `src/ui/` — panel and windows
- `src/links/`, `src/logs/` — links and logs

## Style

TypeScript strict, 2 spaces, double quotes, semicolons.  
Logical headers after Habblet offset; parsers/composers for new packets.
