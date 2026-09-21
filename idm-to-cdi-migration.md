# IdM id → Cdi id

Parent plan: LMS will stop putting **IdM ids** in tokens and will put **Cdi ids** in new tokens. The two id spaces are disjoint. After **Phase 6 (the switch)**, **person-keyed ALeA data uses email as `userId`**. The token contains **only** the Cdi id (JWT field name **TBD**; **assume `userId` is reused** until LMS says otherwise). `userInfo.cdiId` is a **lookup** column for that token id, not the data key. **No** assumptions about Cdi id string shape.

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
| LMS / tokens | New tokens contain **Cdi id only**. IdM tokens invalid after the switch. JWT field name **TBD**; **assume `userId` reused** for now. **No** assumed Cdi id format. |
| Canonical data key after Phase 6 | **Email.** One re-key: IdM id → email. **No** second re-key to Cdi id. |
| Phase 6 mapping source | **Production DB** `userInfo` only (verified email ↔ `idmId`). **Not** CSVs. That table already combines CSV fill + user-supplied verified emails. |
| Phase 6 writes | Comments/user DB and grading DB: `userInfo.userId` and **every column that stores that person id**, **including where there is no declared FK**. **Skip + support** on collision. |
| Phase 6 does **not** rewrite | LMS data (ALeA **provides the mapping**; LMS re-keys itself); ACL rows (fixed by **recompute / restart**); Matomo, caches-as-data, JSON instructor blobs, interview files, other stores. |
| `userInfo.cdiId` | Nullable unique column. **May be added now** (stays null until post-switch bind). Set when Cdi login is bound to a row. Reject binding a Cdi id already used on another email. |
| `userInfo.idmId` | **Keep.** |
| Which rows Phase 6 rewrites | IdM rows with **`isVerified` email**. **Do not** rewrite password-signup rows (`userId` already email, `idmId` null). Unverified emails are **not** rewritten (those IdM keys are lost). |
| Switch | **Downtime** (whole system down). LMS vs DB order: **our choice**. |
| Password / email-signup users | **Unaffected** by the re-key. |
| Fake-login (`fake_xxx`) | **Not decided.** |
| After switch: Cdi token, no `cdiId` yet | **Cdi login first** (replaces IdM login) → token holds Cdi id. Lookup `userInfo.cdiId`. If that Cdi id is **not** bound to a **mail-verified** email: **hard gate**, staging in **`unverifiedUsers`** (see [Staging (`unverifiedUsers`)](#staging-unverifiedusers)). Ask them to provide email and **mail-verify** (`@fau.de` for now). Then delete the staging row and either **(a)** insert `userInfo` or **(b)** set `cdiId` on the existing row. |
| New JWT payload | After the switch, tokens **do not contain names**. **`persistUserInfoFromJwt` is not used** to fill `userInfo` from Cdi tokens. **New** users supply names themselves. Existing rows keep names already stored. |
| LMS mapping file | Two-column CSV: **`idmId`, `email`**. |
| Grading/ACL-only IdM ids with no verified `userInfo` email | **Data lost.** |
| Who loses the IdM-keyed account | **Not** a verified email on `userInfo` before Phase 6 (whether that email came from CSV fill or the user). |
| Support email | **TBD.** |

---

## Phase 6 — the switch (re-key by email from prod DB)

**Downtime.** Do **not** load StudOn CSVs here.

1. **Mapping** = production `userInfo` rows with `idmId` set, `isVerified`, `email` present. Join is **email ↔ `idmId`** (and today’s `userId` = IdM id for those rows).
2. **Comments/user DB:** change `userInfo.userId` from IdM id to that email; update **every column that stores that person id**, declared FK or not (includes job-portal person columns in this DB).
3. **Grading DB:** the same, including `grading.userId` if it is not a declared FK.
4. **Skip + support** if two IdM ids share one email, if the email is already another row’s `userId` (e.g. password account), or composite/FK update fails.
5. **ACL:** do not patch membership strings in this script; **recompute / restart** after cutover.
6. **LMS:** ALeA exports a two-column CSV **`idmId`, `email`**. LMS re-keys **its** stores.
7. `cdiId` may already exist as null. IdM tokens stop; new tokens carry Cdi id in **`userId`** until LMS names another field.

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
        mapping := prod userInfo (verified email ↔ idmId)
        rewrite comments DB (userInfo.userId + FK columns) and grading DB
        give mapping to LMS; LMS re-keys itself
        ACL: recompute / restart
        LMS issues Cdi tokens only (assume JWT field userId)
        │
        ▼
     user logs in via Cdi flow (replaces IdM flow)
        token contains Cdi id
        lookup userInfo.cdiId
        if bound to a mail-verified email → proceed (data keyed by email)
        else hard gate (unverifiedUsers): provide email + mail-verify @fau.de (for now)
           ├── email matches existing userInfo → set cdiId; delete staging
           └── email not in userInfo → new row, userId = email, set cdiId; names supplied by user (not JWT); delete staging
```

---

## Account loss (explicit)

**Lost:** no **verified** `userInfo.email` before Phase 6 (and therefore not in the prod mapping Phase 6 uses). Includes grading/ACL-only IdM ids never given a `userInfo` email.

**Kept:** verified email already on `userInfo` (CSV fill **or** user verify). Phase 6 rewrites those keys to email. After cutover they still cannot use the app until they **mail-verify again** and `cdiId` is set.

**New email after switch:** **new** account (no old IdM rows).

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

### Phase 5a — Schema that can ship now (IdM still live)

- `userInfo.cdiId` nullable **unique** (stays null).
- Table `unverifiedUsers` as above (stays empty until Cdi tokens).
- No change to `getUserId` / IdM persist yet.

### Phase 5b — Pre-switch email on `userInfo` (child)

- Keep IdM collect/verify **on**.
- Run `fillIdmEmailsFromMapping` (CSVs → `userInfo.email` / `isVerified` on **existing** rows only). Does **not** change `userId`.
- Coverage before Phase 6 = who keeps IdM-keyed history.

### Phase 6 — Switch (downtime)

Whole system down. LMS vs DB order: our choice, **same window**.

1. Mapping from **prod** `userInfo`: `idmId` + verified `email` (not CSVs).
2. Rewrite comments/user DB (`userInfo.userId` + **every column that stores that person id**, FK or not) and grading DB the same way.
3. Password rows: **do not touch**. Unverified / no-email IdM keys: **not** rewritten (**lost**).
4. Collision: **skip + support**.
5. Export two-column CSV **`idmId`, `email`** for LMS; LMS re-keys itself.
6. ACL: **recompute / restart** (do not patch membership strings in the rewrite script).
7. LMS issues Cdi tokens only (assume JWT field `userId`).

Person-keyed ALeA data is now **email**. `idmId` kept. `cdiId` still null until Phase 7 promote.

### Phase 7 — Cdi identity, hard gate, promote (code; live at LMS flip)

- Login is the **Cdi flow** (replaces IdM). Token Cdi id → `userInfo.cdiId` → `userInfo.userId` (email) for all real data.
- No match / not mail-verified → **hard gate**; `unverifiedUsers`; no comments, grading, job-portal, etc.
- Do **not** call `persistUserInfoFromJwt` to create or name Cdi users.
- Mail verify `@fau.de` (for now) → promote as in [Staging](#staging-unverifiedusers).
- **New** `userInfo` rows: user supplies **names** (JWT has none). Path **(b)** keeps names already on the row.
- `isFauId(userId)` is false for rewritten users (`userId` is email). Anything that meant “campus login” must use `idmId` / `cdiId` / auth path, not `userId` length 8. Ship this with the flip or the job-portal/quiz checks break.

### Phase 8 — Aftercare (not a second re-key)

- Confirm rewrite leftovers: `userInfo` where `idmId` is set and `userId` still equals `idmId` (should be unverified/lost only).
- Empty `unverifiedUsers` ops (abandoned pending rows) as needed.
- Fake-login after Cdi: **not in this plan** until [K](#open-items).

---

## Open items

### K. Fake users

Not decided. This plan does not specify fake-login after Cdi tokens.

### L. Support email

Address for collisions, skip+support, lost accounts. **TBD.**

### N. Staging mechanism

**Decided:** table **`unverifiedUsers`**. See [Staging (`unverifiedUsers`)](#staging-unverifiedusers).

### O. Cdi JWT field name

**TBD.** Working assumption: reuse **`userId`**.

---

## Challenges (from confirmed facts only)

### 1. Token key ≠ data key

JWT has Cdi id; rows are keyed by **email**. Request path: token `userId` (assumed) → `userInfo.cdiId` → `userInfo.userId` (email) for data. If `cdiId` is missing: staging/hard-gate, **not** `INSERT userInfo(userId = cdiId)`.

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
- ALeA rewriting LMS / Matomo / JSON instructor ids / ACL membership strings (ACL: recompute/restart; LMS: they re-key from our mapping).
- Defining fake-login after the switch ([K](#open-items)).
- Recovery UX for lost accounts.
- A second rewrite from email to Cdi id.
- Assumptions about Cdi id string format.

---

## Relation to the child plan

| Child (pre-switch, IdM tokens) | Phase 6 + after (this document) |
| --- | --- |
| JWT is IdM id | JWT is Cdi id (assume field `userId`) |
| `userId` stays IdM id | `userId` + FK/grading keys → **email** |
| CSV fill + collect write `userInfo.email` | Phase 6 **reads** that prod mapping; **no CSVs** |
| Collect: client redirect; APIs still work | Cdi login first; `unverifiedUsers` + hard gate until mail-verified `@fau.de` (for now) and `cdiId` set |
| Names from IdM JWT via `persistUserInfoFromJwt` | Cdi JWT has **no names**; new users supply them; persist-from-JWT not used for Cdi |
| Password signup already `userId` = email | Unaffected by re-key |
| `fake_xxx` | Not decided |
