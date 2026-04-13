# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, and API routes (`app/api/**/route.ts`).
- `components/`: Reusable React UI and feature components (`components/ui/*` for base UI primitives).
- `lib/`: Core logic (drivers, env parsing, data fetching, polling, geo helpers).
- `messages/` and `i18n/`: Locale dictionaries and internationalization wiring.
- `public/`: Static assets and PWA icons; `styles/` contains global styles.
- `docker/`: Compose examples for container deployment.
- `.github/workflows/`: CI, auto-fix, and release automation.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile`: Install dependencies exactly from lockfile.
- `pnpm dev`: Start local dev server on `http://localhost:3040`.
- `pnpm lint`: Run Biome lint checks.
- `pnpm check`: Run Biome lint + format validation.
- `pnpm check:fix`: Auto-fix lint and formatting issues.
- `pnpm build`: Create production build (also prepares `.next/standalone` assets).
- `pnpm start`: Run the standalone production server.
- Docker quick start: run `docker compose up -d` inside `docker/` after creating `docker/.env`.

## Coding Style & Naming Conventions
- Language stack: TypeScript + React (`strict` mode enabled in `tsconfig.json`).
- Formatting/linting is enforced by Biome (`biome.json`):
  - 2-space indentation, 100 char line width.
  - Double quotes, trailing commas `all`, semicolons `asNeeded`.
  - Keep Tailwind classes sorted (`nursery/useSortedClasses`).
- Naming patterns:
  - React components: `PascalCase` file names (for example `ServerCard.tsx`).
  - Route handlers: `route.ts` under `app/api/...`.
  - Utility modules: concise lowercase or domain-based names in `lib/`.

## Testing Guidelines
- There is currently no dedicated unit/integration test script in `package.json`.
- Required quality gate is: `pnpm lint` and `pnpm build` (matches CI workflow).
- For UI or data-flow changes, perform a manual smoke check in `pnpm dev` and verify impacted API routes/pages.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style used in history: `feat:`, `fix:`, `chore:`, optional scopes like `feat(server-detail): ...`.
- Keep commits focused; avoid mixing refactors with behavior changes.
- Before opening PR: run `pnpm check` and `pnpm build`.
- PRs should include:
  - Clear summary of user-visible/behavioral changes.
  - Linked issue(s) when applicable (`#123`).
  - Screenshots or short recordings for UI updates.
- Note: an auto-fix workflow may push formatting/lint corrections to open PR branches.

## Security & Configuration Tips
- Copy `.env.example` to `.env` for local setup; never commit real tokens.
- Common secrets include `NezhaAuth` and service base URLs; treat them as sensitive.
