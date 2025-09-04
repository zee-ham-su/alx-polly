# Security Audit Report — ALX Polly

Date: 2025-09-04
Author: Internal security review

## 1) Scope

- App: Next.js (App Router), React 19, TypeScript
- Backend: Supabase (auth + Postgres)
- Code reviewed:
  - Server actions: `app/lib/actions/poll-actions.ts`
  - Auth provider: `app/lib/context/auth-context.tsx`
  - Root layout and middleware: `app/layout.tsx`, `lib/supabase/middleware.ts`, `middleware.ts`
  - Supabase client/server setup: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Assumptions:
  - Supabase Row Level Security (RLS) is enabled on application tables.
  - Tables: `polls(id, user_id, question, options, created_at, ...)`, `votes(id, poll_id, user_id, option_index, created_at, ...)`.

## 2) Methodology

- Static code review (authN/authZ, data access, business logic)
- Threat modeling for key flows (create, update, delete polls; vote)
- Config review (middleware, session handling)
- Lightweight runtime sanity assumptions (no production data touched)

## 3) Findings

### F1. IDOR on poll deletion (High)
- Location: `app/lib/actions/poll-actions.ts` (deletePoll)
- Issue: Deletion previously filtered only by `id`, with no ownership check.
- Impact: Any authenticated user knowing a poll id could delete another user’s poll (Insecure Direct Object Reference).
- Fix:
  - Enforce authentication and constrain delete by `user_id = current_user`.
  - Recommend RLS policy: allow delete only where `polls.user_id = auth.uid()`.

### F2. Weak vote integrity allows ballot stuffing (High)
- Location: `app/lib/actions/poll-actions.ts` (submitVote)
- Issues:
  - Didn’t require login (allowed `user_id = null`).
  - No validation that poll exists or that `optionIndex` is within bounds.
  - No check to prevent duplicate votes per user per poll.
- Impact: Vote stuffing, data corruption, potential DoS via unbounded inserts.
- Fix:
  - Require login.
  - Validate `pollId` (UUID) and `optionIndex` range against retrieved poll.
  - Block duplicate votes via existence check.
  - Recommend DB unique index `(poll_id, user_id)` and `user_id NOT NULL`.
  - Recommend RLS policy: `votes.user_id = auth.uid()`.

### F3. Insufficient input validation/sanitization for polls (Medium)
- Location: `app/lib/actions/poll-actions.ts` (createPoll, updatePoll)
- Issues: No trimming, duplicates allowed, no length bounds (question/options), unbounded number of options.
- Impact: Storage bloat, inconsistent UX, potential performance issues.
- Fix:
  - Add zod schema: question ≤ 200 chars, options 2–10, trim + case-insensitive de-duplication.

### F4. Broad column selection can leak new fields (Low/Medium)
- Location: `getUserPolls`, `getPollById`
- Issue: Used `select("*")`.
- Impact: If sensitive columns are added later, they may be exposed unintentionally.
- Fix: Use explicit column lists (id, question, options, user_id, created_at).

### F5. Missing id format validation (Low)
- Location: Multiple functions accepting `id: string`
- Issue: No UUID validation.
- Impact: Unnecessary DB churn and brittle errors on invalid input.
- Fix: Add a UUID regex gate and return a clear error early.

### F6. Hydration mismatch warnings from client-only attributes (Low)
- Location: `app/layout.tsx`
- Issue: Browser extensions can inject attributes before hydration leading to mismatch warnings.
- Impact: Dev-time warnings/overlays; confusing DX.
- Fix: `<html lang="en" suppressHydrationWarning>` to ignore benign attribute diffs.

### F7. Client auth initialization noise (Low)
- Location: `app/lib/context/auth-context.tsx`
- Issue: Calling `getUser()` without a session surfaces “Auth session missing!” in dev.
- Impact: Noisy logs; confusing during development.
- Fix: Initialize with `getSession()` and then subscribe to `onAuthStateChange`.

## 4) Remediation summary (Implemented)

- Input validation and normalization with zod for create/update polls.
- Authentication + ownership enforcement on delete/update.
- Voting hardened: login required, poll/option validated, duplicate votes blocked.
- Narrowed selects; UUID checks; improved cache invalidation.
- Hydration warnings suppressed safely; client auth init fixed.

Files updated:
- `app/lib/actions/poll-actions.ts`
- `app/layout.tsx`
- `app/lib/context/auth-context.tsx`

## 5) Database recommendations (Supabase)

Apply these in addition to app-layer checks.

- Unique vote per user per poll:
  - `create unique index if not exists votes_unique_user_per_poll on votes(poll_id, user_id);`
- Enforce not-null user_id:
  - `alter table votes alter column user_id set not null;`
- RLS policies (examples, adjust to your schema):
  - polls update/delete: `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
  - votes insert/select: `using (user_id = auth.uid()) with check (user_id = auth.uid())`.

Optional policy to prevent self-voting:
- On votes insert: disallow when `exists (select 1 from polls p where p.id = votes.poll_id and p.user_id = auth.uid())`.

## 6) Verification checklist

- User A creates a poll; user B attempts to delete/update it ⇒ denied.
- Logged-out visitor attempts to vote ⇒ denied with clear error.
- Logged-in user attempts second vote on same poll ⇒ blocked.
- Create/update with blank/duplicate/too many options or long question ⇒ validation error.
- With common extensions enabled, load pages ⇒ no hydration mismatch errors.
- Load app logged-out ⇒ no repeated “Auth session missing!” console errors.

## 7) Risk ratings

- F1 IDOR delete: High (authZ bypass)
- F2 Vote integrity: High (data integrity + abuse)
- F3 Validation gaps: Medium (integrity/UX)
- F4 Broad select: Low/Medium (potential data exposure)
- F5 UUID checks: Low (robustness)
- F6 Hydration warnings: Low (DX only)
- F7 Auth noise: Low (DX only)

## 8) Next steps

- Add rate limiting on server actions (e.g., IP + user-based) to mitigate abuse.
- Add tests for server actions and RLS policies.
- Consider policy to disallow self-voting.
- Improve UX error surfaces to map validation errors to fields.

---

This report reflects the current state after remediation and should be revisited with each feature change or schema update.
