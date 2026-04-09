# RHDZMOTA Support Platform

A multi-tenant support operations platform built by [RHDZMOTA](https://rhdzmota.com) for managing client relationships, support requests, internal communication, and a knowledge base.
It is powered by [Convex](https://convex.dev) (backend + real-time DB) and a [Vite](https://vitejs.dev/) + React frontend.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Overview of open, in-progress, and critical requests across the active workspace |
| **Requests** | Full support ticket lifecycle — create, assign, prioritize, and track bugs, features, incidents, consultations, and questions |
| **Conver** | Internal async messaging ledger with threaded replies, message quoting, and scheduled delivery |
| **Knowledge Base** | Scoped article management — draft, publish, and organize documentation by system/tag |
| **Hotline** | Public-facing `GET /hotline` route that shows on-call support engineer contact info after auth |
| **Support Team** | Per-workspace SLA configuration and support engineer directory (email, phone, WhatsApp, scheduling URL) |
| **Workspaces** | Multi-tenant org switcher; users are auto-enrolled into orgs matching their email domain allowlist |

---

## Architecture

```
/
├── src/                    # Vite + React frontend
│   ├── components/         # Feature modules (Dashboard, Requests, Conver, KnowledgeBase, Hotline, SupportTeam, ...)
│   ├── config/
│   │   └── workspaces.ts   # Static workspace definitions & allowlist logic
│   ├── context/
│   │   └── WorkspaceContext.tsx
│   └── App.tsx             # Routing (root vs /hotline), authenticated shell
│
├── convex/                 # Convex serverless backend
│   ├── schema.ts           # Database schema (orgs, requests, kb, conver, support team, ...)
│   ├── workspaces.ts       # Org enrollment, membership, preferences
│   ├── requests.ts         # Support ticket CRUD + stats
│   ├── kb.ts               # Knowledge base article CRUD
│   ├── conver.ts           # Messaging + threaded replies + scheduled delivery
│   ├── supportTeam.ts      # SLA config + engineer roster
│   ├── auth.ts / auth.config.ts
│   └── http.ts / router.ts # HTTP API routes
│
├── Dockerfile              # Production container (node:20-alpine, serves built Vite app)
└── railway.json            # Railway deployment config
```

---

## Authentication

Authentication is handled by [Convex Auth](https://auth.convex.dev/) using **email + password**, with an optional **anonymous sign-in** flow.

Access control is workspace-scoped: after signing in, users are automatically enrolled in any workspace whose `allowlist` matches their email or email domain (e.g. `*@acme.com`).

---

## Workspace Configuration

Workspaces are defined statically in [`src/config/workspaces.ts`](./src/config/workspaces.ts).  
Each workspace has a `slug`, a display `name`, an `is_active` flag, and an `allowlist` of exact emails or domain wildcards.

```ts
// Example workspace entry
{
  slug: "acme",
  name: "Acme Corp",
  is_active: true,
  allowlist: ["*@acme.com", "contractor@partner.org"],
}
```

To add a new client workspace, append an entry to the `WORKSPACES` array and redeploy.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A [Convex](https://convex.dev) account and project

### 1. Clone and install dependencies

```bash
git clone https://github.com/rhdzmota/support.rhdzmota.com.git
cd support.rhdzmota.com
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_CONVEX_URL` | Your Convex deployment URL (e.g. `https://xxx.convex.cloud`) |
| `VITE_CONVEX_SITE_URL` | Your Convex site URL (used for auth JWKS issuer) |
| `SUPPORT_PASSCODES` | Optional comma-separated passcodes for hotline access |
| `SUPPORT_DOMAINS` | Optional comma-separated allowed domains for sign-up |

### 3. Set up Convex Auth

```bash
node setup.mjs
```

This runs `npx @convex-dev/auth` to configure auth environment variables on the Convex side.

### 4. Run locally

```bash
npm run dev
```

This starts both the Vite frontend and the Convex backend in parallel.  
The frontend is available at `http://localhost:5173` and the app's hotline route at `http://localhost:5173/hotline`.

---

## Deployment

### Docker (recommended)

Build the production image:

```bash
docker build \
  --build-arg VITE_CONVEX_URL=<your_convex_url> \
  --build-arg VITE_CONVEX_SITE_URL=<your_convex_site_url> \
  -t support-platform .
```

Run it:

```bash
docker run -p 3000:3000 support-platform
```

### Railway

This project includes a [`railway.json`](./railway.json) config that builds via the `Dockerfile` automatically.  
Set `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` as Railway build variables and deploy.

---

## Project Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start frontend (Vite) + backend (Convex) in parallel |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run dev:backend` | Start Convex dev server only |
| `npm run build` | Build the Vite production bundle |
| `npm run lint` | Type-check + Convex validation + Vite build |

---

## License

This project is licensed under the **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.

You are free to use, share, and adapt this work — including for commercial purposes — as long as you:
- Give appropriate **attribution** to the original author (RHDZMOTA)
- Distribute any derivative work under the **same license**

See the [LICENSE](./LICENSE) file for full terms, or visit [creativecommons.org/licenses/by-sa/4.0](https://creativecommons.org/licenses/by-sa/4.0/).
