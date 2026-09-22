# IdM id → Cdi id

Parent plan: LMS will stop putting **IdM ids** in tokens. After **Phase 6 (the switch)**, **person-keyed ALeA data uses email as `userId`**. The token field `user_id` is **retired**. Campus `getuserinfo` returns `cdiId`. Email-password `getuserinfo` returns `email`. Fake-login `getuserinfo` returns `fakeId`. None of these return names. ALeA reads `getuserinfo`; it does not read the token itself. `userInfo.cdiId` is a **lookup** column for the campus token's `cdiId`, not the data key. **No** assumptions about Cdi id string shape. The switchover order for the LMS is in [idm-to-cdi-switchover.md](./idm-to-cdi-switchover.md).

The child plan [email-as-userid-migration.md](./email-as-userid-migration.md) is **pre-switch**: attach verified email to IdM-keyed rows (CSV fill **and** user collect/verify) while tokens are still IdM ids. Phase 6 **does not** read CSVs. It reads the **production `userInfo` mapping** (CSV-filled **and** user-supplied verified emails) and **rewrites `userId`**.

This document does not specify implementation code. [Open items](#open-items) are not defaults.

---

## Why

- IdM tokens become **invalid**.
- New tokens identify the person by **Cdi id**.
- There is **no** IdM id → Cdi id function. The join is **email**.
- Without a verified email on `userInfo` **before** Phase 6, an IdM-keyed row cannot be matched later. That account is **lost**.

---

## Child document (pre-switch)

**[email-as-userid-migration.md](./email-as-userid-migration.md)** — while JWT identity is still the IdM id, store **verified** email on `userInfo` (StudOn/CSV fill script **and** `/collect-email`). Keep collecting until Phase 6.

That fill **does not** change `userId`. **Phase 6** (this document) **does**.

---

## Confirmed decisions

| Topic | Decision |
| --- | --- |
| LMS / tokens | `user_id` is **retired**. A token or `getuserinfo` body that still has `user_id` is rejected. Campus login returns `cdiId` and `issued`. Email-password login returns `email` and `issued`. Fake-login returns `fakeId` and `issued`. Names are not returned. **No** assumed Cdi id format. |
| Canonical data key after Phase 6 | **Email.** One re-key: IdM id → email. **No** second re-key to Cdi id. |
| Phase 6 mapping source | **Production DB** `userInfo` only (verified email ↔ `idmId`). **Not** CSVs. That table already combines CSV fill + user-supplied verified emails. |
| Phase 6 writes | Comments/user DB and grading DB only: `userInfo.userId`, **every column that stores that person id** (including `ACLMembership` and `courseMetadata.instructors` JSON), declared FK or not. **Skip + support** on collision. In-memory ACL is **recomputed on restart**, not rewritten as rows. |
| Phase 6 does **not** rewrite | LMS data (ALeA **provides the mapping**; LMP re-keys its user model); Matomo; interview files; caches-as-data; any store that is not the comments database or the grading database. |
| `userInfo.cdiId` | Nullable unique column. **May be added now** (stays null until post-switch bind). Set when Cdi login is bound to a row. Reject binding a Cdi id already used on another email. |
| `userInfo.idmId` | **Keep.** |
| Which rows Phase 6 rewrites | IdM rows with **`isVerified` email**. **Do not** rewrite password-signup rows (`userId` already email, `idmId` null). IdM rows with an **unverified** email: **do not** rewrite `userId`; **flag** them and **clear** `email` / `verificationToken` so post-switch promote cannot bind Cdi to that leftover IdM key. Those IdM keys are **lost**. |
| Switch | **Downtime** (whole system down). Order is in [idm-to-cdi-switchover.md](./idm-to-cdi-switchover.md). A preparation mapping may be sent earlier for a dry run. The mapping used for the re-key is **sent again after downtime starts**. |
| Password / email-signup users | **Unaffected** by the re-key. Their `getuserinfo` field changes from `user_id` to `email`. `@fau.de` is required for the campus flow, not for this flow. |
| Fake-login | Token shape is **decided**: `getuserinfo` returns `fakeId` and `issued`, and does not return names or `user_id`. |
| After switch: Cdi token, no `cdiId` yet | **Cdi login first** (replaces IdM login) → token holds Cdi id. Lookup `userInfo.cdiId`. If that Cdi id is **not** bound to a **mail-verified** email: **hard gate**, staging in **`unverifiedUsers`** (see [Staging (`unverifiedUsers`)](#staging-unverifiedusers)). Ask them to provide email and **mail-verify** (`@fau.de` for now). Then delete the staging row and either **(a)** insert `userInfo` or **(b)** set `cdiId` on the existing row. |
| New `getuserinfo` payload | After the switch, responses **do not contain names**. **`persistUserInfoFromJwt` is not used** to fill `userInfo` from Cdi tokens. **New** users supply names themselves. Existing rows keep names already stored. |
| LMS mapping file | Two-column CSV: **`idmId`, `email`**. |
| Grading/ACL-only IdM ids with no verified `userInfo` email | **Data lost.** |
| Who loses the IdM-keyed account | **Not** a verified email on `userInfo` before Phase 6 (whether that email came from CSV fill or the user). |
| Support email | **TBD.** |

---

## Phase 6 — the switch (re-key by email from prod DB)

**Downtime.** Do **not** load StudOn CSVs here.

1. **Unverified IdM emails:** list IdM `userInfo` rows (`idmId` set) that have an email with `isVerified` not true. Write them to the report (`phase6-unverified-idm-emails.csv`). **Clear** `email` and `verificationToken` on those rows (do not change `userId`). Password rows: **do not** clear. Do this **before** the verified rewrite so an unverified holder of the same mailbox cannot skip a verified re-key.
2. **Mapping** = production `userInfo` rows with `idmId` set, `isVerified`, `email` present. Join is **email ↔ `idmId`** (and today’s `userId` = IdM id for those rows).
3. **Comments/user DB:** change `userInfo.userId` from IdM id to that email; update **every column that stores that person id**, declared FK or not (includes job-portal person columns, `ACLMembership`, and `courseMetadata.instructors` JSON in this DB).
4. **Grading DB:** the same, including `grading.userId` if it is not a declared FK.
5. **Skip + support** if two IdM ids share one email, if the email is already another row’s `userId` (e.g. password account), or composite/FK update fails.
6. **In-memory ACL:** recompute on ALeA restart. Database ACL rows are part of step 3.
7. **LMS:** ALeA may send a two-column CSV **`idmId`, `email`** before downtime so both sides can dry-run. After downtime starts, ALeA **sends that file again**. LMP re-keys its user model from the second file.
8. `cdiId` may already exist as null. `user_id` stops. Campus `getuserinfo` returns `cdiId`. Email-password `getuserinfo` returns `email`. Fake-login `getuserinfo` returns `fakeId`.

Password rows: **do not touch**.

---

## Intended sequence (high level)

```
now ──► keep collecting + verifying email (IdM tokens)
        optional CSV fill onto userInfo.email / isVerified (child, not Phase 6)
        still collect for users who log in
        optional: add nullable unique userInfo.cdiId
        │
        ▼
     PHASE 6 — THE SWITCH (downtime; entire system down)
        flag + clear unverified emails on IdM userInfo rows (report; userId unchanged)
        resend mapping := prod userInfo (verified email ↔ idmId)
        rewrite comments DB (userId columns, ACL rows, instructors JSON) and grading DB
        LMP re-keys its user model from that resent mapping
        in-memory ACL: recompute when ALeA restarts
        getuserinfo: cdiId | email | fakeId; user_id rejected; no names
        │
        ▼
     user logs in via Cdi flow (replaces IdM flow)
        getuserinfo.cdiId
        lookup userInfo.cdiId
        if bound to a mail-verified email → proceed (data keyed by email)
        else hard gate (unverifiedUsers): provide email + mail-verify @fau.de (for now)
           ├── email matches existing userInfo → set cdiId; delete staging
           └── email not in userInfo → new row, userId = email, set cdiId; names supplied by user (not JWT); delete staging
```

---

## Account loss (explicit)

**Lost:** no **verified** `userInfo.email` before Phase 6 (and therefore not in the prod mapping Phase 6 uses). Includes grading/ACL-only IdM ids never given a `userInfo` email. IdM rows that only had an **unverified** email: Phase 6 **clears** that address; the IdM-keyed history stays lost. Post-switch mail-verify of that mailbox is a **new** email-keyed account (or bind to an existing email/password row), not restore of the leftover IdM `userId`.

**Kept:** verified email already on `userInfo` (CSV fill **or** user verify). Phase 6 rewrites those keys to email. After cutover they still cannot use the app until they **mail-verify again** and `cdiId` is set.

**New email after switch:** **new** account (no old IdM rows), unless that email is already a password / rewritten `userId`.

No recovery path for lost accounts is in this plan.

---

## Staging (`unverifiedUsers`)

**Decision N.** A Cdi principal with no mail-verified email must **not** get a `userInfo.userId` (or any person-keyed write).

Table **`unverifiedUsers`** (comments/user DB):

| Column | Role |
| --- | --- |
| `cdiId` | Cdi id from the token. Unique. One pending row per Cdi login. |
| `emailAddress` | Set when they submit an address; **null** until then. Unique when non-null (two Cdi ids must not pending-verify the same mailbox). |
| `verificationToken` | Set when mail is sent. |

**Flow**

1. Cdi login → token. If `userInfo.cdiId` matches and email is mail-verified → normal app (`userId` = email).
2. Else **everything blocked**. Upsert `unverifiedUsers` by `cdiId` (email/token still null on first hit).
3. They submit `@fau.de` (for now) → store email + token, send mail. Changing address replaces email + token (old link dies).
4. Verify (email + token, same as today; other browser OK) → in **one** comments-DB transaction: delete staging row; **(a)** `INSERT userInfo` (`userId` = email, `cdiId`, names **from the user**, not JWT) or **(b)** `UPDATE` existing `userInfo` set `cdiId` (keep existing names). If `userInfo.cdiId` unique would be violated → skip + support.

**Must not:** `INSERT userInfo` / `persistUserInfoFromJwt` from a Cdi token before this promote. After the switch, Cdi JWTs have **no names**; that helper is **not** the source of `firstName` / `lastName`.

`getUserId` for real data uses only `userInfo` (via `cdiId`). Staging is not a user id.

---

## Implementation phases

Child Phases 0–5 stay **done (prod)** ([email-as-userid-migration.md](./email-as-userid-migration.md)). **Do not** reuse “Phase 6” for CSV fill. Order below is the remaining program. **Phase 7 code must be live in the same downtime as Phase 6** (when LMS flips to Cdi tokens). Schema can ship earlier while IdM is still live.

### Phase 5a — Schema that can ship now (IdM still live) — **in repo**

- `userInfo.cdiId` nullable **unique** (stays null until Cdi bind).
- Table `unverifiedUsers` (`cdiId` PK, nullable unique `emailAddress`, `verificationToken`).
- Migration `20260921170000_add_cdiid_unverified_users`. Apply with `pnpm prisma:migrate-deploy` (or `pnpm prisma:migrate-dev` locally).
- No change to `getUserId` / IdM persist.

### Phase 5b — Pre-switch email on `userInfo` (child)

Keep IdM collect/verify **on**. Fill **existing** `userInfo` rows from StudOn CSVs + `additional_mappings.csv`. Does **not** change `userId`. Script: `packages/nodejs-scripts/src/fillIdmEmailsFromMapping.ts`.

From repo root (loads `packages/alea-frontend/.env.local` / `packages/nodejs-scripts/.env.local`):

```bash
# Dry run (default)
SCRIPT_NAME=fillIdmEmailsFromMapping pnpm exec nx serve nodejs-scripts

# Write
FILL_IDM_EMAIL_APPLY=1 SCRIPT_NAME=fillIdmEmailsFromMapping pnpm exec nx serve nodejs-scripts
```

Optional: `IDM_MAPPING_DIR` (default `student_data/`). Writes `idm-email-fill-report.json` and `idm-email-fill-not-fau.de.txt` in that directory.

Coverage before Phase 6 = who keeps IdM-keyed history. Do **not** set `REWRITE_IDM_APPLY=1`.

### Phase 6 — Switch (downtime)

Whole system down. LMS vs DB order: our choice, **same window**.

1. Flag IdM `userInfo` rows with unverified email; on apply, clear `email` / `verificationToken` (`phase6-unverified-idm-emails.csv`). Password rows: do not clear.
2. Mapping from **prod** `userInfo`: `idmId` + verified `email` (not CSVs).
3. After downtime starts, export the two-column CSV **`idmId`, `email`** again (`phase6-lms-idmid-email.csv`, rewritable rows only). This resent file is the one LMP uses. A file sent earlier is only for the dry run.
4. Rewrite comments/user DB (`userInfo.userId`, every person-id column including `ACLMembership` and `courseMetadata.instructors` JSON, FK or not) and grading DB the same way.
5. Password rows: **do not touch**. Unverified / no-email IdM keys: **not** rewritten (**lost**); unverified addresses on those rows are cleared in step 1.
6. Collision: **skip + support**.
7. In-memory ACL: **recompute when ALeA restarts**.
8. LMS `getuserinfo` returns `cdiId`, `email`, or `fakeId`. `user_id` is rejected.

Script: `packages/nodejs-scripts/src/rewriteIdmUsersFromMapping.ts` (mapping from **prod `userInfo`**, not CSVs).

```bash
# Dry run
SCRIPT_NAME=rewriteIdmUsersFromMapping pnpm exec nx serve nodejs-scripts

# Write
REWRITE_IDM_APPLY=1 SCRIPT_NAME=rewriteIdmUsersFromMapping pnpm exec nx serve nodejs-scripts
```

Optional: `IDM_REWRITE_OUT_DIR` (default `student_data/`). Does **not** INSERT `userInfo`. Clears unverified emails on IdM rows first. Rewrites `ACLMembership.memberUserId` and `courseMetadata.instructors` JSON. Does not rewrite Matomo or interview files.

Person-keyed ALeA data is now **email**. `idmId` kept. `cdiId` still null until Phase 7 promote.

### Phase 7 — Cdi identity, hard gate, promote (code; **gated**, live at LMS flip)

**Env (default off):** `NEXT_PUBLIC_CDI_AUTH=true` (Next.js public env; rebuild after changing). Do **not** set this until Phase 6 rewrite has finished **and** LMS is issuing Cdi tokens. With the flag off, IdM `getUserId` / `persistUserInfoFromJwt` behavior is unchanged.

When the flag is off, `getuserinfo.user_id` is still the IdM id. When the flag is on, a body that contains `user_id` is rejected. Campus uses `cdiId`, email-password uses `email`, and fake-login uses `fakeId`.

When the flag is on:

- Campus login: `getuserinfo.cdiId` → `userInfo.cdiId` → `userInfo.userId` (email). Password login: `getuserinfo.email` is the `userId`.
- No `cdiId` match / not mail-verified → **hard gate**; `unverifiedUsers`; no comments, grading, job-portal, etc. `/api/is-logged-in` stays true so `/collect-email` works. This second mail verification is ALeA-only. It is not an LMS step.
- Do **not** call `persistUserInfoFromJwt` to create or name Cdi users (no INSERT; names are not in `getuserinfo`).
- Mail verify `@fau.de` (campus flow; not email-password) → promote as in [Staging](#staging-unverifiedusers). New rows collect **first and last name** on `/collect-email`.
- `isFauId(userId)` is false for rewritten users (`userId` is email). Campus checks use `authProvider` / `idmId` / `cdiId` (`isCampusAccount`).

### Phase 8 — Aftercare (not a second re-key)

- Confirm rewrite leftovers: `userInfo` where `idmId` is set and `userId` still equals `idmId` (lost only; `email` should be null after the unverified clear).
- Empty `unverifiedUsers` ops (abandoned pending rows) as needed.
- Fake-login token shape is decided ([K](#open-items)).

---

## Open items

### K. Fake users

**Decided** for the token. After the switch, fake-login `getuserinfo` returns `fakeId` and `issued`. It does not return names or `user_id`.

### L. Support email

Address for collisions, skip+support, lost accounts. **TBD.**

### N. Staging mechanism

**Decided:** table **`unverifiedUsers`**. See [Staging (`unverifiedUsers`)](#staging-unverifiedusers).

### O. Cdi field name

**Decided.** Campus `getuserinfo` field is **`cdiId`**. `user_id` is not reused.

---

## Challenges (from confirmed facts only)

### 1. Token key ≠ data key

`getuserinfo` has `cdiId`; rows are keyed by **email**. Request path: `getuserinfo.cdiId` → `userInfo.cdiId` → `userInfo.userId` (email) for data. If `cdiId` is missing: staging/hard-gate, **not** `INSERT userInfo(userId = cdiId)`.

### 2. No IdM ↔ Cdi map

Preserve-account coverage = **verified** `userInfo.email` before Phase 6.

### 3. Staging vs `userInfo`

A Cdi principal with no verified email lives only in `unverifiedUsers`. `persistUserInfoFromJwt` must not create `userInfo` from Cdi tokens.

### 4. Two databases

Phase 6 updates comments DB and grading DB. **No** distributed transaction. Downtime must cover both.

### 5. `isFauId(userId)`

After Phase 6, rewritten `userId`s are emails, so `isFauId(userId)` is false. Campus vs not cannot use `userId` length 8. `idmId` remains; Cdi id is a different string with **no** assumed shape.

### 6. Password row + Cdi login

If a Cdi user verifies an email that is already a password `userId`, Phase 6 did not rewrite that row; post-switch bind **sets `cdiId` on the existing row** (same email). That is the “existing user” path, not a merge of two IdM rows. Two IdM ids → one email at Phase 6 is still **skip + support**.

### 7. Names

Cdi JWTs have no given name / surname. New users enter names at provision. Do not overwrite existing `firstName` / `lastName` on path (b) with blanks from a missing JWT claim.

---

## Out of scope (explicit)

- Inventing an IdM id → Cdi id table that LMS does not provide.
- Automatic merge when Phase 6 hits a collision (skip + support only).
- ALeA rewriting LMS data, Matomo, or interview files (LMP re-keys its user model from ALeA's mapping).
- Recovery UX for lost accounts.
- A second rewrite from email to Cdi id.
- Assumptions about Cdi id string format.

---

## Relation to the child plan

| Child (pre-switch, IdM tokens) | Phase 6 + after (this document) |
| --- | --- |
| `getuserinfo.user_id` is the IdM id | `user_id` is retired. Campus `cdiId`, password `email`, fake-login `fakeId` |
| `userId` stays IdM id | `userId` + FK/grading keys → **email** |
| CSV fill + collect write `userInfo.email` | Phase 6 **reads** verified emails from that prod mapping; **no CSVs**. Unverified IdM emails are **cleared** (flagged in `phase6-unverified-idm-emails.csv`) |
| Collect: client redirect; APIs still work | Cdi login first; `unverifiedUsers` + hard gate until mail-verified `@fau.de` (for now) and `cdiId` set |
| Names from IdM JWT via `persistUserInfoFromJwt` | Cdi JWT has **no names**; new users supply them; persist-from-JWT not used for Cdi |
| Password signup already `userId` = email | Unaffected by re-key |
| `fake_xxx` | Token returns `fakeId` and `issued` only |
