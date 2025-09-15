# Repository Guidelines

## Project Structure & Module Organization
SwiftEDU runs on the Next.js App Router. Routes and pages sit in `app/` (dashboard, student-dashboard, reset-password) and API handlers in `app/api`. Shared hooks, contexts, and utilities live under `app/hooks`, `app/contexts`, and `lib/` (including `lib/supabase`). Global styles are in `app/globals.css`, complementary styles in `app/styles/`, and static assets in `public/`. Ops docs reside in `docs/`, SQL migrations in `supabase/migrations/`, and helper scripts in `scripts/`.

## Build, Test, and Development Commands
- `npm run dev` — start Next.js with hot reload.
- `npm run build` — create the production bundle.
- `npm run start` — serve the compiled build.
- `npm run lint` — run the Next ESLint rules.
- `npm run type-check` — run the TypeScript compiler without emitting files.
- `npm run lint:full` — lint + type-check gate; run before every pull request.

## Coding Style & Naming Conventions
TypeScript is standard. Keep two-space indentation and rely on `next lint` (Prettier via ESLint) for formatting. React components and corresponding files use PascalCase (`NotificationBell.tsx`), hooks stay `useCamelCase`, and utility modules favor lower camel case. Prefer Tailwind classes for layout and scope custom CSS to module files or `app/styles/`. Share client helpers through `lib/` and keep sensitive server code under `app/api`.

## Testing Guidelines
Automated tests are not yet established, so document manual checks in each PR. The `app/test-auth` route quickly verifies Supabase session logic, and `node scripts/create-test-user.js` seeds the default admin once `.env.local` has Supabase keys. When introducing tests, mirror the feature directory (`app/dashboard/__tests__/...`), state the command here, and prioritize auth, enrollment, and reporting flows.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit prefixes (`fix:`, `chore:`) with short imperative subjects; Portuguese body text is fine when helpful. Keep each commit focused and avoid mixing refactors with behavior changes. Pull requests should outline intent, list affected routes or scripts, and attach UI screenshots or recordings when styles shift. Confirm `npm run lint:full` and the relevant manual steps before requesting review.

## Supabase & Configuration Tips
Environment settings stay in `.env.local`; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and service-role keys for admin scripts, and never commit them. SQL changes belong in `supabase/migrations/`—add new files rather than editing history and mention them in PRs. For repeatable maintenance, retarget `run-migration.js` to the new SQL file or apply the statements via the Supabase dashboard while keeping the repo updated.
