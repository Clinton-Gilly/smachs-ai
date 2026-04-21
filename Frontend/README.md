# Smachs AI Frontend

Next.js 14 + Tailwind + shadcn/ui frontend for the Gemini RAG Service backend.

## Getting started

```bash
# 1) Install dependencies
npm install

# 2) Configure backend URL (already set to http://localhost:5000/api in .env.local)
cp .env.example .env.local

# 3) Start the backend (in the Gemini-RAG-Service-master folder)
# In a separate terminal:
#   npm run dev     (from the backend root)

# 4) Start the frontend
npm run dev
```

Open http://localhost:3000

## Wired endpoints
- `GET  /api/health` — topbar live indicator
- `POST /api/query/stream` — SSE streaming chat (events: `step`, `context`, `chunk`, `complete`, `error`)

## What's included
- **Layout**: collapsible sidebar (brand, search, new-chat, nav, recent history, user card), topbar (breadcrumb, health pill, notifications, theme toggle)
- **Chat**: welcome screen with popular-task cards, streaming assistant responses with inline step progress and retrieved-context previews, copy/feedback actions, mode toggle (General / RAG), auto-growing composer with ⌘↵ send
- **Theming**: light + dark via `next-themes`, full CSS-variable palette

## Structure
```
app/                 Next.js app router
  layout.tsx         Root layout with ThemeProvider
  chat/page.tsx      Main chat page
components/
  layout/            AppShell, Sidebar, Topbar
  chat/              ChatView, MessageBubble, Composer, Welcome
  ui/                shadcn primitives
  theme-provider.tsx
  theme-toggle.tsx
lib/
  api.ts             REST helpers
  stream.ts          SSE reader for /api/query/stream
  utils.ts
```
