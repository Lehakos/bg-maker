# BG Maker

Monorepo for a board game prototyping web app.

## Workspaces

- `client`: React, Vite, Tailwind CSS, TanStack Query, TanStack Router, Axios, Mantine.
- `shared`: shared TypeScript types and constants.
- `server`: Fastify API.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

The client runs on `http://localhost:5173` and proxies `/api` to the Fastify server on `http://localhost:3000`.
