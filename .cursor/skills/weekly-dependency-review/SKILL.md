---
name: weekly-dependency-review
description: >-
  Weekly package.json and pnpm audit review for the Nx monorepo. Runs
  pnpm outdated + pnpm audit, checks npm deprecation/metadata, greps for actual
  usage, reviews pnpm-workspace.yaml overrides. For high/critical audit hits,
  triage hotfix vs weekly vs cycle in-skill. Use when the user asks for a
  weekly dependency review, package audit, pnpm outdated report, or
  release-cycle dependency check. Say "update the skill" to refresh learned
  patterns.
---

# Weekly Dependency Review

Recurring release-cycle audit for root `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.

**Monorepo reference:** [monorepo-notes.md](monorepo-notes.md)  
**Override patterns:** [override-patterns.md](override-patterns.md)

---

## Human-in-the-loop (required)

**Default mode: report only — no code changes** unless the user explicitly asks to apply fixes (overrides, version bumps, removals).

1. **Collect** — run audits and usage greps
2. **Triage** — for high/critical **P0** findings, follow **Step 5b** (hotfix vs weekly vs cycle)
3. **Report** — deliver the six-section report (template below), including release timing
4. **Propose** — prioritized actions with fix priority (P0–P3) and hotfix vs weekly when applicable
5. **Implement** — only after explicit approval in that session
6. **Verify** — `pnpm install && pnpm audit` after any override/lockfile change
7. **Update skill** — refresh learned patterns when workflow or override floors drift

---

## Weekly review workflow

Copy this checklist and track progress:

```
Weekly dependency review:
- [ ] Step 1: Run pnpm outdated + pnpm audit
- [ ] Step 2: Check npm deprecation/metadata for flagged packages
- [ ] Step 3: Grep actual usage for suspicious direct deps
- [ ] Step 4: Review pnpm-workspace.yaml (overrides, allowBuilds)
- [ ] Step 5: Classify outdated pkgs (patch / minor / major)
- [ ] Step 5b: Triage high/critical (hotfix vs weekly) — see below
- [ ] Step 6: Produce six-section report
- [ ] Step 7: User approves fixes (if any)
- [ ] Step 8: Apply approved changes + re-audit
- [ ] Step 9: Refresh skill if patterns changed (required when overrides drift)
```

### Step 1 — Automated audits

Read the live `package.json` and `pnpm-workspace.yaml` first — never review from remembered versions or from the examples in these notes.

From repo root, run these two in parallel (each takes a few seconds):

```bash
pnpm outdated
pnpm audit
```

**Exit codes are not failures.** `pnpm outdated` exits `1` whenever anything is outdated; `pnpm audit` exits `1` whenever findings exist. Both are expected — read the output, do not retry or report the command as broken.

Summary counts for the executive summary:

```bash
pnpm audit --json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')),m=d.metadata||{};console.log(JSON.stringify({vulnerabilities:m.vulnerabilities,dependencies:m.dependencies},null,2))"
```

Resolve actual installed versions for every audit hit — audit reports the *advisory* range, not what is installed:

```bash
pnpm why <pkg> | head -40
pnpm list <pkg> --depth=3 | head -60
rg "^\s*'?<pkg>@" pnpm-lock.yaml | head -20
```

### Step 2 — npm metadata

For packages that are outdated majors, deprecated, or unusual:

```bash
npm view <pkg> deprecated version
npm view <pkg>@<current-major> deprecated
```

An empty result means "not deprecated". Querying a major range (`<pkg>@2`) prints a line per deprecated version — noisy but conclusive.

Flag: git/GitHub tarballs, beta/pre-release tags, exact-pinned versions, Node-builtin npm shims, and dual stacks serving one purpose. See [monorepo-notes.md](monorepo-notes.md) § "Unusual / watchlist".

### Step 3 — Usage verification

**All direct deps live in root `package.json`.** There is no second importer and no lib-level `package.json`.

Grep each suspicious direct dep across **every** source root:

```bash
rg "from ['\"]<pkg>|require\(['\"]<pkg>" --glob '*.{ts,tsx,js,jsx,mjs}' packages spec prebuild-scripts prisma
```

Also search root config (`next.config.js`, `prisma.config.ts`, `*.config.{js,ts}`) before calling a dep unused.

Batch the greps — run many in parallel rather than one package at a time.

**Zero import hits does not mean unused.** Before calling anything removable, check for:

| Wiring | Example |
| --- | --- |
| Peer dependency of a used package | `@emotion/*` (MUI) |
| Build-tool config, not TS imports | `sass` for `.scss` modules |
| Subpath-only imports | package used only as `pkg/subpath` |
| Framework runtime | `sharp` (Next image optimization) |
| Native / externalized | `canvas` (`serverExternalPackages` in Next config) |
| Toolchain accelerant | `@parcel/watcher` (Nx), native binding optionalDeps |
| Node builtin vs npm shim | `path` / `crypto` / `stream` imports are usually Node, not the npm packages |

Confirm with `npm view <parent> peerDependencies` when peer status is the deciding factor.

### Step 4 — `pnpm-workspace.yaml`

This file is **pnpm config only** (no `packages:` list). Nx `project.json` still defines apps/libs; they are not workspace packages. Do not add `packages/` as pnpm workspace members.

| Section | Review |
| --- | --- |
| `allowBuilds` / `onlyBuiltDependencies` | Do not remove entries without testing `pnpm install` (pnpm 11 native builds) |
| `ignoredBuiltDependencies` | Currently skips `cypress` build — leave unless testing a change |
| `overrides` | Compare audit `patched versions` vs lockfile floors; stale floors are common. Sync the duplicate blocks in root `package.json` |

When audit reports vulnerabilities despite overrides, the override floor is usually **one patch behind**. See [override-patterns.md](override-patterns.md).

After override edits: `pnpm install && pnpm audit` until clean or document unfixable residual risk.

### Step 5 — Classify outdated packages

| Tier | Rule | Recommend this week? |
| --- | --- | --- |
| **Patch** | Same `major.minor`, bump `.z` | Yes — especially security-adjacent (Next, React) |
| **Minor** | Same major | Yes with targeted CI (Prisma, Sentry, Cypress, typescript-eslint) |
| **Major** | New major line | **Defer by default** — see upgrade policy below |

Group `pnpm outdated` output into these three buckets in the report.

### Step 5b — Release timing for high/critical P0

P0 vs P1 is **reachability**. Hotfix vs weekly is **timing**. Do not treat every P0 as an emergency prod push.

There is **no sibling `vulnerability-release-triage` skill** in this repo. Do the timing call here:

1. Confirm the finding is high/critical **and** reachable in production runtime (P0).
2. Note installed vs patched versions (already resolved in Step 1).
3. If easy: look up CVE/GHSA for CVSS; note KEV / in-the-wild if the advisory says so.
4. Decide:

| Decision | When |
| --- | --- |
| **hotfix** | Actively exploited, or trivial remote RCE/auth bypass in prod runtime with a patch on the current major |
| **weekly (don’t slip)** | P0 in prod runtime, patched on current line, not known in-the-wild |
| **normal cycle** | Dev/test-only, or needs a major bump / large regression |

- **No high/critical P0** → skip; say so in section 3.
- **P1/P2 high/critical** (dev CLI, test-only) → leave in the audit table; do not run full timing unless CVSS ≥ 9 on a package that could ship in the prod image.

Put the triage table in the report (section 3). Action items must name **hotfix**, **weekly (don’t slip)**, or **normal cycle** — not only “upgrade pkg”.

### Step 6 — Report template (required)

Every finding needs **version, path, and fix priority**. Severity alone is not priority — a high-severity advisory reachable only from a dev CLI outranks nothing in production.

| Priority | Meaning |
| --- | --- |
| **P0** | Reachable in production runtime, or blocks a release |
| **P1** | Build/CI toolchain, or production-adjacent with no live exposure |
| **P2** | Dev-only tooling, hygiene, dependency cleanup |
| **P3** | Nice-to-have; track, do not action this week |

```markdown
# Weekly dependency review — [date]

## 1. Executive summary
[2–4 sentences: audit counts by severity, patch/minor/major split, top risk, recommended focus]

## 2. Risky / experimental / deprecated / unusual deps
| Package | Version | Path | Risk | Notes |

## 3. Audit findings
[Split into "P0 — production runtime" and "P1/P2 — dev & tooling" tables]
| Package | Resolved | Patched | Paths | Priority |

### Release timing (high/critical P0)
[From Step 5b — or "none"]
| Finding | CVE/GHSA | Installed → patched | CVSS | EPSS | KEV / in-the-wild | Workaround in prod? | Decision |

## 4. Outdated packages
### Patch — safe this week
### Minor — apply with targeted testing
### Major — defer (state why per package)

## 5. Likely unused deps
| Package | Version | Evidence | Verdict |

## 6. Action items
Reply with **Do**, **Defer**, or **Ignore** for each numbered item:

1. [Concrete action] — [priority], [hotfix | weekly | cycle], [effort], [brief risk/test note]
2. [Concrete action] — [priority], [hotfix | weekly | cycle], [effort], [brief risk/test note]

Example response: `Do: 1, 2 · Defer: 3 · Ignore: 4, 5`

[Close with an explicit numbered "do NOT upgrade this week" item when applicable]
```

Deliver the report in chat as markdown. Keep tables to short enumerable facts; put reasoning in prose around them. End with numbered, decision-ready action items so the user can respond without restating package names. Do not apply anything until the user marks an item **Do**.

---

## Upgrade policy

> Suggest upgrade to a vX.0.0 release very rarely. Wait for vX.0.1 or vX.1.0. Let the open-source community, side-project developers, and early adopters find the critical bugs and memory leaks first.

| Situation | Policy |
| --- | --- |
| New `vX.0.0` just shipped | **Do not recommend.** Wait for `vX.0.1` or `vX.1.0` unless P0 security with no patch backport on the current line |
| `vX.0.1+` / `vX.1.0+` available | May recommend for **non-critical** deps after one release cycle |
| Patch/minor on current major | Recommend freely when audit or changelog warrants |
| Critical areas (auth, sanitization, data, FTML) | Extra caution on **any** major — dedicated PR + full regression, never bundled into the weekly batch |

Critical-area deps to flag in every report: `next`, `@sentry/nextjs`, `prisma` / `@prisma/*`, `bcrypt`, `jsonwebtoken`, `dompurify`, `canvas`, `sharp`, `@flexiformal/*`. Details in [monorepo-notes.md](monorepo-notes.md).

**pnpm enforces a cooling-off period.** `minimumReleaseAge` (pnpm 11 default: 1440 min) blocks installing releases published in the last day. This repo does **not** currently set `minimumReleaseAgeExclude`. If an install refuses a version that `pnpm outdated` just listed, that is the guard working — not an error to route around.

---

## Applying approved fixes

### Patch/minor bumps (direct deps)

```bash
pnpm update <pkg>@<target>   # or edit package.json ranges, then pnpm install
```

Keep scoped sets aligned (e.g. `next` + `eslint-config-next`; `@flexiformal/ftml` + `ftml-backend` + `ftml-react`; `@nx/*` + `nx`).

### Transitive audit fixes (overrides)

Edit `pnpm-workspace.yaml` `overrides:` — add or raise floors to match audit `patched versions`. Comment each override with GHSA id when known. Mirror the same floors in root `package.json` `"pnpm".overrides` and `"overrides"`.

Re-run:

```bash
pnpm install && pnpm audit
```

### Removing unused deps

Only after grep confirms zero usage **and** no peer-dep requirement:

```bash
pnpm remove <pkg>
```

### Post-fix verification

```bash
pnpm install && pnpm audit
nx run-many -t lint --projects=alea-frontend,utils,stex-react-renderer
# CI currently runs `npm run build` (Nx build of alea-frontend) — use `pnpm build` locally
```

There is no root `pnpm lint` or `pnpm ci:local` script.

Report the lockfile delta (`git diff --stat pnpm-lock.yaml`) so the reviewer knows the blast radius. An override batch commonly shifts dozens of transitive packages with zero application-code change.

---

## Guardrails

- **Never commit** unless the user explicitly asks.
- **Never bump a major unprompted**, even to clear an audit finding — propose an override or a scoped patch instead and let the user decide.
- **Never weaken an existing override floor** to make an install succeed.
- **Never remove an `allowBuilds` / `onlyBuiltDependencies` entry** without a clean `pnpm install` proving it is unnecessary.
- **Do not hand-edit `pnpm-lock.yaml`.**
- **Do not invent a `packages:` workspace list** or a second importer.

---

## Self-update (Step 9)

Run when any of these happened this session:

- An override floor had to change to clear audit → record the *shape* of the miss in `override-patterns.md`
- A grep returned zero hits for a package that turned out to be in use → add the wiring type to `monorepo-notes.md`
- A new unusual dep appeared in `package.json` → add it to the watchlist with its *reason*
- A documented command failed or misled → fix the command in `SKILL.md`
- User says **"update the skill"**

| File | Update with |
| --- | --- |
| `override-patterns.md` | New recurring shapes, stale-floor lessons, dated "Learned patterns" entry |
| `monorepo-notes.md` | Watchlist reasons, source roots, peer/config wiring traps |
| `SKILL.md` | Only when a workflow step, command, or policy actually changes |

**Do not store version numbers, audit counts, or current override floors** — they go stale within a week and a stale copy is worse than none. Store *where to look* and *what pattern to expect*.

Delete guidance that proved wrong rather than appending a correction beneath it. Leave skill edits uncommitted for review alongside the dependency changes.

---

## Examples

**User:** "Weekly package.json review"

→ Steps 1–6 including 5b if high/critical P0, report only, no file changes.

**User:** "Is this Next.js audit a hotfix or weekly?"

→ Still run this review for versions/paths; Step 5b is the answer. Do not skip the audit tables.

**User:** "Run the weekly dependency review and apply security fixes"

→ Report first → apply P0 overrides/patches → `pnpm install && pnpm audit` → summarize lockfile delta → leave uncommitted.

**User:** "Audit still shows findings after I added the overrides"

→ Stale-floor check: `pnpm why <pkg>` + lockfile grep per finding → compare installed version against the advisory's `Patched versions` → raise floors (all three override blocks) → re-run.

**User:** "Can we drop these unused packages?"

→ Grep all source roots → check peer deps and build-config wiring → propose only the confirmed-zero set, with the removal command for the user to run.

**User:** "Update the skill from what we just did"

→ Diff `pnpm-workspace.yaml` + `package.json` → add dated entry to `override-patterns.md` → propose edits, apply after user OK.
