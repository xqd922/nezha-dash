# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router pages, layouts, and API handlers such as `app/api/server/route.ts`. Reusable UI lives in `components/`, with base primitives under `components/ui/` and route-specific client code under `app/(main)/ClientComponents/`. Shared logic, data fetching, and helpers belong in `lib/`. Locale wiring is split between `i18n/` and `messages/`. Static assets and PWA files live in `public/` and `app/`, while `styles/` holds global CSS. Docker deployment examples are in `docker/`.

## Build, Test, and Development Commands
Run the scripts from `package.json` with Bun:

- `bun install`: install dependencies from the Bun lockfile.
- `bun run dev`: start the local app on `http://localhost:3040`.
- `bun run lint`: run the ESLint checks used by the project.
- `bun run build`: create a production build and copy standalone assets.
- `bun run start`: run the standalone production server.

For container testing, run `docker compose up -d` from `docker/` after preparing the required environment variables.

## Coding Style & Naming Conventions
The codebase is TypeScript-first with `strict` mode enabled. Follow existing React and Next.js patterns. Use `PascalCase` for React component files such as `ServerCard.tsx`, keep API handlers in `route.ts`, and use concise domain-based names in `lib/`. Prettier is configured with `prettier-plugin-tailwindcss` and `@trivago/prettier-plugin-sort-imports`; run formatting before opening a PR.

## Testing Guidelines
There is no dedicated unit test runner in this repository today. The minimum quality gate is `bun run lint` plus `bun run build`. For UI, routing, or API changes, do a manual smoke test in `bun run dev` and verify the affected page or endpoint.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style already used in history: `feat:`, `fix:`, `docs:`, `style:`, `i18n:`. Keep each commit focused on one change. PRs should include a short summary, linked issues when relevant, and screenshots or recordings for visible UI changes.

## Security & Configuration Tips
Keep secrets out of git. Store runtime values in local environment files and review any auth or upstream service settings before committing deployment changes.
