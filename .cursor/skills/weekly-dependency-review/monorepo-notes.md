# Monorepo — dependency review notes

Living reference for `weekly-dependency-review`. Update when the repo layout or watchlist changes.

---

## Layout

This is an **Nx workspace with a single importer**. There are no nested `package.json` files. Apps and libs share root deps via TypeScript path aliases in `tsconfig.base.json`.

| Path | Role |
| --- | --- |
| `package.json` | Only importer. All direct deps live here (`packageManager` is pinned — read it, do not assume). |
| `pnpm-lock.yaml` | Single lockfile |
| `pnpm-workspace.yaml` | pnpm **config only** (`overrides`, `allowBuilds`, `onlyBuiltDependencies`, `ignoredBuiltDependencies`). **No `packages:` list** — do not add one. |
| `.npmrc` | Currently only `node-linker=hoisted`. Read it each cycle; do not assume `auto-install-peers` or `strict-peer-dependencies` flags from other repos. |
| `nx.json` | `workspaceLayout.appsDir` and `libsDir` are both `packages` |
| `prisma/comments/schema.prisma` | Prisma schema (`prisma generate --schema=…` from root scripts) |

**Overrides are duplicated.** The same floors currently appear in:

1. `pnpm-workspace.yaml` `overrides:` (pnpm 11 source of truth)
2. root `package.json` `"pnpm".overrides`
3. root `package.json` `"overrides"` (npm-style; CI still runs `npm ci`)

When changing a floor, keep all three in sync unless the user explicitly wants to drop a copy.

Nx `project.json` files define apps/libs; none of them are pnpm workspace packages.

### Source roots to grep (all of them)

```
packages  spec  prebuild-scripts  prisma
```

Also include root config files (`next.config.js`, `prisma.config.ts`, `*.config.{js,ts}`) when a dep looks unused.

### Nx projects (for blast-radius notes, not separate importers)

| Path | Nx name | Kind |
| --- | --- | --- |
| `packages/alea-frontend` | `alea-frontend` | Next.js app (main product) |
| `packages/alea-frontend-e2e` | `alea-frontend-e2e` | Cypress e2e |
| `packages/nodejs-scripts` | `nodejs-scripts` | Node batch scripts (IDM, cheatsheets, …) |
| `packages/nodejs-scripts-e2e` | `nodejs-scripts-e2e` | e2e for scripts |
| `prebuild-scripts` | `prebuild-scripts` | esbuild Node app; `pnpm prebuild` / `start` / `build` run it |
| `prebuild-scripts-e2e` | `prebuild-scripts-e2e` | e2e |
| `packages/comments` | `comments` | lib (`@alea/comments`) |
| `packages/markdown` | `markdown` | lib (`@alea/markdown`) |
| `packages/mathjax` | `mathjax` | lib (`@alea/mathjax`) |
| `packages/node-utils` | `node-utils` | lib (`@alea/node-utils`) |
| `packages/quiz-utils` | `quiz-utils` | lib (`@alea/quiz-utils`) |
| `packages/react-utils` | `react-utils` | lib (`@alea/react-utils`) |
| `packages/report-a-problem` | `report-a-problem` | lib |
| `packages/stex-react-renderer` | `stex-react-renderer` | lib (`@alea/stex-react-renderer`) |
| `packages/utils` | `utils` | lib (`@alea/utils`) |
| `spec` | `api` | lib (`@alea/spec`) |

---

## Unusual / watchlist (check every cycle)

Read current versions from `package.json` each cycle — the *reason* each package is on this list is what persists.

| Package | Why it is on the list |
| --- | --- |
| `root` (`github:tanstack/react-query`) | GitHub git dependency under an odd name. App code imports `@tanstack/react-query` from the registry packages. Flag every cycle; do not treat as a normal registry bump |
| `crypto`, `path`, `stream` | npm packages that shadow Node builtins. Source uses `import path from 'path'` / `import crypto from 'crypto'` (Node). Confirm whether the npm shims are load-bearing or leftover |
| `@flexiformal/ftml`, `@flexiformal/ftml-backend`, `@flexiformal/ftml-react` | Exact-pinned domain packages; core course-notes / quiz rendering. Bump only as a set, never in a bulk `pnpm update` |
| `canvas` | Native. Overridden, in `allowBuilds` / `onlyBuiltDependencies`, and `serverExternalPackages` in `packages/alea-frontend/next.config.js` |
| `bcrypt` | Native auth hashing; `allowBuilds` |
| `@mui/material` ^6 vs `@mui/system` ^7 | Dual MUI major. Do not "align" blindly |
| `next` override pin | Direct dep is `^15.5.29` **and** overridden to exact `15.5.29`. Scoped eslint package should move with it |
| `npm-force-resolutions` | Yarn/npm-era leftover in `devDependencies`; no `package-lock.json` in-tree. Candidate for unused |
| `nx-cloud` vs `nx` | Major-line mismatch (`nx-cloud` 19 vs `nx` 22) — flag, do not bulk-upgrade |
| Exact-pinned Nx / SWC / Jest / ESLint / sass / typescript | Intentional toolchain pins. Bump as a set with Nx, never in a bulk `pnpm update` |

---

## Critical-area dependencies

Extra caution on **any major** bump; call out in report every cycle:

- **Auth:** `bcrypt`, `jsonwebtoken`
- **HTML sanitization:** `dompurify`
- **App shell:** `next`, `@sentry/nextjs`
- **Data:** `prisma`, `@prisma/client`, `@prisma/adapter-mariadb`, `serverless-mysql`, `ioredis`
- **Native / image:** `canvas`, `sharp`
- **Email:** `nodemailer`
- **sTeX / FTML:** `@flexiformal/*`

---

## Likely-unused candidates (grep before recommending removal)

Re-verify each cycle — peers and config wiring change:

| Package | Grep note |
| --- | --- |
| `root` (github tanstack) | Likely unused if `@tanstack/react-query` already satisfies imports |
| `crypto`, `path`, `stream` | Builtin usage ≠ the npm packages |
| `npm-force-resolutions` | No lockfile script using it |
| `@swc/cli` | May only appear in `package.json` |
| `ts-node` | Nx jest may pull transitively |
| `@types/dompurify` | Lives in `dependencies`; types often belong in `devDependencies` |

---

## Keep despite zero (or few) TS imports

| Package | Reason |
| --- | --- |
| `@emotion/react`, `@emotion/styled` | MUI peers; `@emotion/styled` is also imported directly |
| `sass` | Next + `.scss` modules under `packages/alea-frontend`, `stex-react-renderer`, `markdown`, `comments` |
| `sharp` | Next image optimization **and** `packages/alea-frontend/pages/api/cheatsheet/post-cheatsheet.ts` |
| `@swc/helpers` | SWC runtime helpers |
| `@parcel/watcher` | Nx file-watching accelerant (`allowBuilds`) |
| `canvas` | `packages/node-utils` + Next `serverExternalPackages` |

---

## `pnpm-workspace.yaml` — do not simplify blindly

- **`allowBuilds` / `onlyBuiltDependencies`:** every entry gates a native/postinstall build (`prisma`, `sharp`, `nx`, `@sentry/cli`, `esbuild`, `canvas`, `bcrypt`, …). Removing one silently skips its build step
- **`ignoredBuiltDependencies`:** currently includes `cypress` — do not "fix" by enabling its build without testing
- **No `packages:` key:** this workspace is root-only. Do not add `packages/` as workspace packages
- **No `minimumReleaseAgeExclude`:** do not claim a Sentry exemption exists here. pnpm 11 still applies default `minimumReleaseAge`; if install refuses a version `pnpm outdated` listed, that is the cooling-off guard

---

## Apps and their distinct runtime deps

| App / area | Notable deps |
| --- | --- |
| `packages/alea-frontend` | Next, MUI, Sentry, Prisma, Redis, JWT/bcrypt, FTML, TanStack Query, xyflow, d3, pdf stack, video.js |
| `packages/nodejs-scripts` | `serverless-mysql`, `dotenv`, `canvas`/`sharp` via shared libs, IDM/cheatsheet jobs |
| `packages/node-utils` | `canvas` |
| `packages/react-utils` | `dompurify` |
| `packages/stex-react-renderer` | `@flexiformal/*` |
| `spec` | `@flexiformal/ftml` + backend query helpers |
| `prebuild-scripts` | Root-hoisted Node toolchain |

A dep used **only** by `packages/nodejs-scripts` or `prebuild-scripts` has a smaller blast radius than one in `alea-frontend`. Say so in the report.
