# ALX Polly: A Polling Application

Welcome to ALX Polly, a full-stack polling application built with Next.js, TypeScript, and Supabase. This project serves as a practical learning ground for modern web development concepts, with a special focus on identifying and fixing common security vulnerabilities.

## About the Application

ALX Polly allows authenticated users to create, share, and vote on polls. It's a simple yet powerful application that demonstrates key features of modern web development:

-   **Authentication**: Secure user sign-up and login.
-   **Poll Management**: Users can create, view, and delete their own polls.
-   **Voting System**: A straightforward system for casting and viewing votes.
-   **User Dashboard**: A personalized space for users to manage their polls.

The application is built with a modern tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Server Components and Client Components

---

## 🚀 The Challenge: Security Audit & Remediation

As a developer, writing functional code is only half the battle. Ensuring that the code is secure, robust, and free of vulnerabilities is just as critical. This version of ALX Polly has been intentionally built with several security flaws, providing a real-world scenario for you to practice your security auditing skills.

**Your mission is to act as a security engineer tasked with auditing this codebase.**

### Your Objectives:

1.  **Identify Vulnerabilities**:
    -   Thoroughly review the codebase to find security weaknesses.
    -   Pay close attention to user authentication, data access, and business logic.
    -   Think about how a malicious actor could misuse the application's features.

2.  **Understand the Impact**:
    -   For each vulnerability you find, determine the potential impact.Query your AI assistant about it. What data could be exposed? What unauthorized actions could be performed?

3.  **Propose and Implement Fixes**:
    -   Once a vulnerability is identified, ask your AI assistant to fix it.
    -   Write secure, efficient, and clean code to patch the security holes.
    -   Ensure that your fixes do not break existing functionality for legitimate users.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## Security Audit and Remediation

This section documents the vulnerabilities identified during the audit and the concrete fixes applied. It also lists recommended Supabase RLS policies and database constraints to enforce security server-side.

### Summary of issues and impact

- Missing authorization on destructive actions
  - deletePoll allowed deletion by id without verifying ownership.
  - Impact: Insecure Direct Object Reference (IDOR) enabling unauthorized poll deletion.

- Weak vote integrity and input validation
  - submitVote permitted anonymous votes, lacked poll existence and bounds checks, and didn’t prevent duplicate votes.
  - Impact: Ballot stuffing, data corruption, potential DoS via unbounded inserts.

- Insufficient input sanitization for polls
  - create/update accepted unbounded/duplicate options and long questions.
  - Impact: Storage bloat, inconsistent data, UX issues.

- Broad column selection on reads
  - select("*") used in reads.
  - Impact: Accidental exposure if sensitive fields are added later.

- No id format checks
  - id parameters weren’t validated as UUIDs.
  - Impact: Unnecessary DB work and brittle error handling.

- Hydration mismatch warnings
  - Browser extensions injected client-only attributes before React hydration.
  - Impact: Dev-time hydration warnings and noisy overlays.

- No-session client error noise
  - Client called getUser() without a session leading to AuthSessionMissingError noise.
  - Impact: Non-fatal, but clutters logs and dev experience.

### Remediation implemented

- Strong validation and normalization for poll input
  - File: `app/lib/actions/poll-actions.ts`
  - Added zod schemas with limits: question ≤ 200 chars; 2–10 options; trims; case-insensitive de-dup.

- Enforced authentication and ownership checks
  - File: `app/lib/actions/poll-actions.ts`
  - deletePoll/updatePoll now require an authenticated user and constrain by `user_id`.
  - submitVote requires login and validates UUID and option bounds.

- Prevented duplicate votes and invalid votes
  - File: `app/lib/actions/poll-actions.ts`
  - submitVote checks existing user vote via a count head query before insert.
  - Set `user_id` to required (no anonymous votes from app layer).

- Reduced data exposure
  - File: `app/lib/actions/poll-actions.ts`
  - Replaced select("*") with explicit columns.

- Defensive id validation and cache revalidation
  - File: `app/lib/actions/poll-actions.ts`
  - UUID format checks on inputs; added `revalidatePath` for list and detail pages.

- Hydration warning suppression for client-only attributes
  - File: `app/layout.tsx`
  - `<html lang="en" suppressHydrationWarning>` to ignore extension-injected attributes.

- Client auth initialization without session noise
  - File: `app/lib/context/auth-context.tsx`
  - Initialize from `supabase.auth.getSession()` and subscribe to auth changes; avoid logging the known no-session message.

### Database hardening (Supabase)

Apply these to complement app-layer checks. Adjust names to your schema.

- Unique vote per (poll_id, user_id)
  - Optional SQL (run in Supabase SQL editor):
    - create unique index if not exists on votes(poll_id, user_id);

- Enforce non-null user_id on votes
  - Optional: alter table votes alter column user_id set not null;

- Recommended RLS policies
  - polls: allow update/delete only when `polls.user_id = auth.uid()`.
  - votes: allow insert/select for rows where `votes.user_id = auth.uid()`; optionally disallow voting on own poll.

### Verification checklist

- As user A, create a poll; as user B, attempt to delete/update it → should fail.
- As a logged-out visitor, try to vote → blocked with clear error.
- As a logged-in user, vote twice on the same poll → second attempt blocked.
- Create/update poll with duplicate/blank options or excessive length → validation error.
- Navigate pages with extensions enabled → no hydration mismatch errors.
- Load app without being logged in → no “Auth session missing!” error spam in console.

### Known limitations / next steps

- Add server-side rate limiting for voting endpoints to further mitigate abuse.
- Add unit/integration tests for server actions and RLS policies.
- Consider preventing users from voting on their own polls via a policy.
- Surface user-friendly error messages in UI for all validation failures.

---

## Getting Started

To begin your security audit, you'll need to get the application running on your local machine.

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v20.x or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.io/) account (the project is pre-configured, but you may need your own for a clean slate).

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd alx-polly
npm install
```

### 3. Environment Variables

The project uses Supabase for its backend. An environment file `.env.local` is needed.Use the keys you created during the Supabase setup process.

### 4. Running the Development Server

Start the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

Good luck, engineer! This is your chance to step into the shoes of a security professional and make a real impact on the quality and safety of this application. Happy hunting!
