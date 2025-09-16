# Repository Guidelines

## Project Structure & Module Organization
SwiftEDU runs on the Next.js App Router. Routes and pages sit in `app/` (dashboard, student-dashboard, reset-password) and API handlers in `app/api`. Shared hooks, contexts, and utilities live under `app/hooks`, `app/contexts`, and `lib/` (including `lib/supabase`). Global styles are in `app/globals.css`, complementary styles in `app/styles/`, and static assets in `public/`. Ops docs reside in `docs/`, SQL migrations in `supabase/migrations/`, and helper scripts in `scripts/`.

## Build, Test, and Development Commands
- `npm run dev` — start Next.js with hot reload.
- `npm run build` — create the production bundle.
- `npm run start` — serve the compiled build.
- `npm run lint` — run the Next ESLint rules.
- `npm run type-check` — run the TypeScript compiler without emitting files.
- `npm run test` — run Vitest in watch mode for focused development.
- `npm run test:ci` — run Vitest once with deterministic output.
- `npm run test:coverage` — collect coverage reports with Vitest.
- `npm run lint:full` — lint + type-check + Vitest gate; run before every pull request.

## Coding Style & Naming Conventions
TypeScript is standard. Keep two-space indentation and rely on `next lint` (Prettier via ESLint) for formatting. React components and corresponding files use PascalCase (`NotificationBell.tsx`), hooks stay `useCamelCase`, and utility modules favor lower camel case. Prefer Tailwind classes for layout and scope custom CSS to module files or `app/styles/`. Share client helpers through `lib/` and keep sensitive server code under `app/api`.

## Testing Guidelines
Vitest with Testing Library powers the automated suite (`npm run test:ci`). Keep new specs alongside the feature they exercise (`app/**/__tests__`) and use the middleware helpers in `middleware.ts` when stubbing enrollment. Always run `npm run lint:full` (now includes the CI-safe tests) before opening a PR and list any manual verification alongside the automated runs. The `app/test-auth` route still helps verify Supabase session logic, and `node scripts/create-test-user.js` seeds the default admin once `.env.local` has Supabase keys. Prioritize auth, enrollment, evaluations, and certification flows when adding coverage.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit prefixes (`fix:`, `chore:`) with short imperative subjects; Portuguese body text is fine when helpful. Keep each commit focused and avoid mixing refactors with behavior changes. Pull requests should outline intent, list affected routes or scripts, and attach UI screenshots or recordings when styles shift. Confirm `npm run lint:full` and the relevant manual steps before requesting review.

## Supabase & Configuration Tips
Environment settings stay in `.env.local`; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and service-role keys for admin scripts, and never commit them. SQL changes belong in `supabase/migrations/`—add new files rather than editing history and mention them in PRs. For repeatable maintenance, retarget `run-migration.js` to the new SQL file or apply the statements via the Supabase dashboard while keeping the repo updated.
