# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bioceutica Creators is a **form builder and creator campaign management platform**. Users build multi-step forms via a visual builder, publish them at public URLs (`/f/[slug]`), collect submissions, and track creator engagement campaigns through a lifecycle (form_filled → order_received → content_published). Automated via n8n webhooks.

## Commands

- **Dev server**: `pnpm dev`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` (ESLint flat config, extends next/core-web-vitals + next/typescript)
- **No test suite** is configured.

## Architecture

**Next.js 16 App Router** with TypeScript, using `@` path alias (`@/*` → `./src/*`).

### Auth & Middleware

- **Supabase Auth** (email/password) with cookie-based sessions via `@supabase/ssr`
- `src/proxy.ts` is the middleware — validates sessions, redirects unauthenticated users to `/login`, returns 401 for protected API routes
- Public routes bypass auth: `/login`, `/f/`, `/api/auth/`, `/accept-invitation`, `POST /api/submissions`, `GET /api/forms/[id]/public`

### Supabase Clients (important distinction)

- `src/lib/supabase/server.ts` — `createSessionClient` (user-scoped, respects RLS) and `createAdminClient` (service role, bypasses RLS)
- `src/lib/supabase/client.ts` — browser-side client (anon key)
- `src/lib/supabase/admin.ts` — server-only service role client
- Use session client for user-facing operations; admin client only for admin/system operations

### Key Modules

- **Form Builder** (`src/components/builder/FormBuilder.tsx`, `src/hooks/useFormBuilder.ts`): Visual form editor with steps, fields, styling, welcome/thank-you pages, product linking. State managed by `useFormBuilder` hook.
- **Form Renderer** (`src/components/renderer/FormRenderer.tsx`): Public-facing form display at `/f/[slug]`. Separate from builder — reads published form data only.
- **Dashboard** (`src/app/dashboard/`): Protected admin area for managing forms, creators, products, prospects, content, analytics, and users.
- **Campaign Lifecycle**: Tracked in `creator_campaigns` table. State transitions triggered by n8n webhooks via `/api/campaigns/` endpoints.
- **Webhooks** (`src/lib/webhook.ts`): Fired on form submission; each form can have its own `webhook_url`. 10-second timeout.

### API Routes

All under `src/app/api/` — RESTful route handlers. Two public endpoints (form submission + public form fetch), everything else requires auth.

### UI Stack

- **shadcn/ui** components in `src/components/ui/` (Radix UI + Tailwind)
- **Tailwind CSS v4** with CSS custom properties for theming
- **Dark mode** via `ThemeProvider` context and `.dark` class
- **lucide-react** for icons, **lottie-react** for animations

### Database

- PostgreSQL via Supabase. Schema in `supabase-setup.sql`.
- Key tables: `profiles`, `forms`, `form_steps`, `form_fields`, `form_submissions`, `products`, `creator_campaigns`, `content`, `invitations`
- RLS enabled on `profiles`, `invitations`, `creator_campaigns`
- Trigger auto-creates profile row on auth user creation

### Field Types

Form fields support: text, textarea, email, phone, number, dropdown, checkbox, radio, datetime, image, paragraph, group, name_group, address_group, boolean. Predefined groups in `src/lib/predefined-groups.ts`.

### External Integrations

- **n8n**: Workflow automation — receives form submissions via webhook, manages campaign lifecycle
- **Prospects API** (`src/lib/prospects-api.ts`): External data source for creator prospects with cursor-based pagination
