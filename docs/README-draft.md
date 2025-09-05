# ALX Polly — Draft README for Contributors

A simple, secure polling app built with Next.js (App Router), TypeScript, and Supabase. Users can create polls, vote, and manage their polls from a dashboard.

## Tech Stack

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (Auth + Postgres + RLS)
- Data Access: Server Actions (Next.js) using Supabase JS

## Setup

1) Clone and install

```bash
git clone <your-fork-url>
cd alx-polly
npm install
```

2) Supabase configuration

- Create a Supabase project.
- In the Supabase dashboard, enable RLS on your tables.
- Create tables similar to:
  - `polls(id uuid pk, user_id uuid, question text, options jsonb, created_at timestamptz default now())`
  - `votes(id uuid pk, poll_id uuid, user_id uuid, option_index int, created_at timestamptz default now())`
- Recommended constraints/policies:
  - Unique vote per user per poll: unique index on `(poll_id, user_id)`.
  - `votes.user_id` NOT NULL.
  - RLS: `polls` update/delete only when `user_id = auth.uid()`; `votes` insert/select where `user_id = auth.uid()`.

3) Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4) Run locally

```bash
npm run dev
```

App runs at http://localhost:3000

## Usage examples

- Create a poll: Login → Dashboard → Create → enter question and 2–10 options → submit.
- Vote on a poll: Open a poll detail page → select an option → submit.
- View results: Poll detail page or your dashboard shows option counts.

## Testing locally

- Smoke test
  - Create a new account and login.
  - Create a poll and ensure it appears in “My Polls”.
  - Vote once; a second vote should be rejected.
- Lint/Typecheck

```bash
npm run lint
npm run tsc
```

## Notes for contributors

- Server actions with Supabase are in `app/lib/actions/`.
- Auth context client provider is in `app/lib/context/auth-context.tsx`.
- Dashboard views are under `app/(dashboard)/`.
- Please read `docs/SECURITY-AUDIT.md` for security posture and RLS guidance.

