# BG Maker

Monorepo base for a tabletop engine reboot.

## Workspaces

- `client`: React, Vite, Tailwind CSS, Mantine, and the existing frontend dependency set.
- `shared`: shared TypeScript types and constants.
- `server`: Fastify API.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

The client runs on `http://localhost:5174` and proxies `/api` to the Fastify server on `http://localhost:3000`.

## Vision

See [`docs/tabletop-engine-vision.md`](docs/tabletop-engine-vision.md).
