# pnpm override patterns

How to clear `pnpm audit` findings via `pnpm-workspace.yaml` `overrides:`.

**The live file is the source of truth.** Read `pnpm-workspace.yaml` **and** the duplicate override blocks in root `package.json` at the start of every cycle. This document holds *patterns and lessons only* — it deliberately does not mirror the current floors, because a stale copy is worse than no copy.

After any override change:

```bash
pnpm install && pnpm audit
```

Keep `pnpm-workspace.yaml` `overrides:` in sync with root `package.json` `"pnpm".overrides` and `"overrides"` unless the user chooses to drop a copy.

---

## Decide: override, bump, or accept

| Situation | Approach |
| --- | --- |
| Direct dep is outdated | `pnpm update` / edit `package.json` — no override |
| Transitive vuln, parent has a fixed release | Bump the parent; prefer this over an override |
| Transitive vuln, parent not fixed yet | Add an `overrides` floor |
| Parent bundles its own old copy despite a newer direct dep | Override — a direct-dep bump will not reach the nested copy |
| Fix requires a brand-new major | **Do not.** Propose it; let the user decide (see upgrade policy) |

An override is a **patch you now own**. Every one needs a comment naming the advisory and why it exists.

---

## Writing an override that actually works

1. Read the advisory's `Patched versions` from `pnpm audit` output — set the floor to **that exact minimum**, not a nearby round number
2. Run `pnpm why <pkg>` to confirm whether the path is production or dev-only (this sets priority, and whether an override is worth the risk)
3. Check how many major lines are installed: `rg "^\s*'?<pkg>@" pnpm-lock.yaml`
4. One line installed → plain floor. Multiple → range-scoped selectors (below)
5. Comment with the GHSA id and the top-level path
6. `pnpm install && pnpm audit`, and iterate — the first floor often is not enough

### Plain floor

```yaml
# High: GHSA-xxxx-xxxx-xxxx — <top-level path>
some-package: ">=1.2.3"
```

### Range-scoped (multiple majors installed)

A single global floor force-upgrades every major line and breaks the ones that were fine. Scope per line instead:

```yaml
"pkg@<1.1.16": ">=1.1.16 <2"
"pkg@>=2.0.0 <2.1.2": ">=2.1.2 <3"
"pkg@>=5.0.0 <5.0.8": ">=5.0.8 <6"
```

### Catch-all for cross-major advisories

Some advisories declare a vulnerable range that spans majors (e.g. `<=5.0.7` matching `1.x` and `2.x` too). Range-scoped selectors alone will not satisfy audit. Add a catch-all **after** the per-line entries, and comment why:

```yaml
# Audit treats 1.x/2.x as within <=5.0.7; force those paths onto the patched line
"pkg@<5.0.8": ">=5.0.8 <6"
```

Verify no runtime actually needed the old major before shipping a catch-all.

---

## Recurring shapes in this repo

Patterns to verify each cycle — do not assume:

| Shape | What it looks like |
| --- | --- |
| **Framework bundles its own copy** | `next` nests `sharp` / `postcss` older than the direct dep. Bumping the direct dep does not help; override does. This repo already floors `next` and `sharp` |
| **Native packages** | `canvas` / `bcrypt` / `sharp` need matching override **and** `allowBuilds` / `onlyBuiltDependencies` |
| **Build-tool chains lag** | `webpack` (Nx) and `vite` → long transitive chains, no upstream fix for weeks |
| **Dev-CLI-only findings** | `prisma` → `@prisma/dev` → its server stack. Moderate severity, no production exposure — say so and rank low |
| **Wrong major line in an override** | An old floor (`>=1.x`) silently stops matching once the parent moves to `2.x`. Re-read floors against installed majors, not against the advisory alone |
| **Minor bump does not clear the child** | A parent's patch release can keep the same vulnerable child range. Check the parent's dependency range (`npm view <parent>@<ver> dependencies.<child>`) before recommending the bump as the fix |
| **Duplicate override blocks drift** | Floor raised in `pnpm-workspace.yaml` but not in `package.json` (or the reverse). Audit follows pnpm; CI `npm ci` follows npm `overrides` |

---

## Stale-floor check (run every cycle)

The most common cause of "audit still fails after overrides" is a floor written for a previous advisory revision.

For each existing override, compare its floor against the advisory's current `Patched versions` and against what is actually installed:

```bash
pnpm why <pkg> | head -20
rg "^\s*'?<pkg>@" pnpm-lock.yaml
```

If installed satisfies the floor but audit still flags it, the floor is behind — raise it.

---

## Learned patterns

Append dated entries for **this** repo; delete ones that searches prove obsolete. Do not copy cycle notes from other monorepos.

*(No local cycles recorded yet.)*
