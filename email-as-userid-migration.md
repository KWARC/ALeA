# Email as `userId`: challenges and migration plan

This document describes how to make the application’s canonical `userId` always be an email address, while **IdM JWT issuance stays unchanged** (Shibboleth / eduGAIN / LMP `getuserinfo` continue to return the existing IdM identifier).

It does not specify implementation code. Items that are not decided are listed under [Open items](#open-items).

## Confirmed decisions


| Topic                                     | Decision                                                                                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IdM JWT `user_id`                         | Unchanged. Token still carries the IdM id (typically 8 characters, e.g. `ym23eqaw`).                                                                                                                                                            |
| Canonical `userId` in this app’s DBs/APIs | **Eventually** email. Until the PK rewrite, IdM rows keep `userId` = IdM id. Lookup is still `userInfo` via `idmId` (JWT `user_id`) or `userId`.                                                                                                |
| Emails on existing `userInfo` (now)       | Collect onto `userInfo.email` only. Do **not** change `userId` or other person-keyed columns. Mapping CSVs may **pre-fill** `email` where the IdM id already has a `userInfo` row and the address is free; that does **not** count as verified. |
| Historical person-keyed rows              | Stay on the IdM id until a later bulk PK rewrite (Phase 3 apply), after most IdM users have a **verified** email.                                                                                                                               |
| Verify API                                | Sets `email` + `isVerified` only. Does **not** rewrite `userId` to email until that later bulk step.                                                                                                                                            |
| Email allowed for IdM users               | Real IdM: FAU email only. This repo today only special-cases `@fau.de` on password signup. Whether other FAU suffixes are allowed is an [open item](#open-items). **`fake_xxx` `idmId`s:** any verifiable email; `@fau.de` is **not** required. |
| Email already used by another account     | Reject (fill/rewrite skips and logs; verify API rejects). User is told to email a support address. The address itself is an [open item](#open-items).                                                                                           |
| Mapping vs verified email                 | Never overwrite a row that already has `isVerified`. If the user confirms a different address than the CSV, keep the verified one.                                                                                                              |
| Fake-login test users                     | Allowed ids are **exactly 8 characters** and match `fake_xxx` (FAU-shaped, e.g. `fake_abc`). Same email collect + verify gate as IdM (`idmId` stored). They do **not** auto-verify and do **not** skip the prompt.                             |
| Anonymous accounts (`_anon_` prefix)      | Removed from UI/API (Phase 0). Wipe remaining rows with `wipeAnonAccounts`.                                                                                                                                                                     |
| Hard gate                                 | IdM and `fake_xxx` users **without** `isVerified` cannot use authenticated APIs (allowlist: session probe, submit/verify email, logout). CSV mapping does **not** skip the prompt. Public pages stay available.                                |


Password / email signup already stores `userInfo.userId = email`. That path is not being redesigned here, except where it collides with IdM binding (unique email, support process).

---

## Current state (from this repo)

### Identity sources

1. **IdM (and fake-login)**
   Cookie `access_token` is a JWT from the auth/LMP server. Server-side `getUserInfo` in `packages/alea-frontend/pages/api/comment-utils.ts` calls `{NEXT_PUBLIC_AUTH_SERVER_URL}/getuserinfo` with `Authorization: JWT …`. `lmpResponseToUserInfo` maps `user_id` → `userId`. That value is **not** an email for IdM (8-character id). Fake-login today may mint other shapes (`fake-…` / personas); the target shape is only `fake_xxx`.
2. **Username/password**
  `packages/alea-frontend/pages/api/login.ts` checks `userInfo` by `userId`, then asks LMP for a token via `/get-email-access-token?email=${userId}`. Signup inserts `userId` and `email` as the same address (`packages/alea-frontend/pages/api/signup.ts`). `@fau.de` is rejected so FAU users are sent to IdM.
3. **Anonymous**
  `userId` is `_anon_<personality>_<animal>`. Rows are created in `userInfo` without email.

### `userInfo` today

Prisma model `userInfo` (comments / “user” MySQL database):

- `userId` is the primary key (`VARCHAR(50)`).
- `email` is optional.
- `verificationToken` / `isVerified` exist for the password path.
- IdM users often have **no row**, or a row created later without email (`INSERT … ON DUPLICATE KEY` in `update-user-info-from-token.ts`, `update-section-review-status.ts`, `update-notificationseen-time.ts`).
- `GET /api/get-user-information` no longer forges `isVerified` for IdM. The hard gate is still **off**, so unverified IdM users can use the app.
- Password login does **not** check `isVerified` (unchanged unless we decide otherwise; not in scope of the IdM hard gate).

ACL code already notes that members may not exist in `userInfo` (`acl-common-utils.ts`).

### Where `userId` is stored

**Comments / user DB** (Prisma `prisma/comments/schema.prisma`). Columns that hold a person id (names vary):


| Location                                    | Column(s)                                                                                                                                  | Notes                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `userInfo`                                  | `userId` (PK)                                                                                                                              | `VARCHAR(50)`                                               |
| `ACLMembership`                             | `memberUserId`                                                                                                                             | `VARCHAR(255)`                                              |
| `Answer`                                    | `userId`                                                                                                                                   |                                                             |
| `Grading` (this DB, NAP homework grading)   | `checkerId`                                                                                                                                |                                                             |
| `comments`                                  | `userId`                                                                                                                                   | also `userEmail` (display; may be null for anonymous posts) |
| `StudyBuddyUsers` / `StudyBuddyConnections` | `userId`, `senderId`, `receiverId`                                                                                                         | Study Buddy also has its own `email` column                 |
| `announcement`                              | `instructorId`                                                                                                                             |                                                             |
| `excused`                                   | `userId`                                                                                                                                   |                                                             |
| `homework` / `homeworkHistory`              | `updaterId`                                                                                                                                |                                                             |
| `courseMetadata`                            | `updaterId`; JSON `instructors[].id`                                                                                                       | instructor ids are not a dedicated SQL column               |
| `semesterInfo`                              | `userId`                                                                                                                                   |                                                             |
| `notifications`                             | `userId`                                                                                                                                   |                                                             |
| `points`                                    | `userId`, `granterId`                                                                                                                      |                                                             |
| `updateHistory`                             | `ownerId`, `updaterId`                                                                                                                     |                                                             |
| `CheatSheet` / `CheatSheetHistory`          | `userId`, `uploadedByUserId`                                                                                                               |                                                             |
| `CourseMaterials`                           | `uploadedBy`                                                                                                                               | `VARCHAR(100)`                                              |
| `BlogPosts`                                 | `authorId`                                                                                                                                 | ignored by Prisma; `VARCHAR(100)`                           |
| Job portal                                  | `studentProfile.userId`, `recruiterProfile.userId`, `jobApplication.applicantId`, `jobApplicationAction.userId`, `jobPost.createdByUserId` | several are `VARCHAR(50)`; FKs to `userInfo.userId`         |
| `orgInvitations`                            | `inviteruserId`                                                                                                                            | `CHAR(36)`                                                  |


**Grading DB** (no Prisma; `sql/grading_database_setup.sql`): table `grading.userId VARCHAR(255)`. Quiz responses are inserted with `getUserIdOrSetError` (`insert-quiz-response.ts`). Separate connection from the comments DB; **no shared transaction**.

**Not in these two DBs (called out, not assumed in-scope):**

- LMP/auth `getuserinfo` and learner-model data keyed by JWT `user_id`.
- Matomo `matomo_log_visit.user_id` (`user-anon-data.ts`, tracker in `_app.tsx`).
- ACL membership **cache** (Redis/set keyed by user id in `CACHE_STORE`).
- Client caches (`cachedUserInfo` in `spec/src/lib/lmp.ts`).

### Logic that assumes IdM id shape

`isFauId` is `id.length === 8 && !id.includes('@')` (`packages/utils/src/lib/utils.ts`). It is used to:

- force FAU IdM login on homework/quiz pages;
- treat job-portal users as student vs recruiter.

After `userId` is an email, `**isFauId(userId)` is always false**. Anything that must mean “this person has an IdM account” has to use `userInfo.IdMId` (or equivalent), not the canonical `userId`.

---

## Target state

- Prisma column is `userInfo.idmId` (nullable, unique). Password-only users have `idmId` null.
- **Until PK rewrite:** IdM `userInfo.userId` stays the IdM id. `getUserId` returns that PK. Comments, ACL, grading stay keyed by IdM id.
- **After PK rewrite:** `userId` is the verified email; `idmId` stays the Login / JWT id. `getUserId` still looks up by `idmId` / `userId` and returns the current PK.
- **Email collection:** every IdM or `fake_xxx` user who uses the app has `userInfo.email` set and `isVerified` true. Real IdM: user-confirmed FAU address. `fake_xxx`: user-confirmed address, any domain. Mapping CSVs are only a pre-fill for rows that already exist in `userInfo`.
- People who appear only in grading/ACL and never log in still have **no** `userInfo` email until they log in (Phase 4) or until a later rewrite script INSERTs from mapping — that INSERT is **not** part of the email-collection step.

---

## Open items

These are **not** filled in by this plan:

1. **Support email** for “this FAU address is already taken”.
2. **Allowed FAU email suffixes** beyond what the code already uses (`@fau.de`) for **real** IdM users.
3. **Stores besides comments DB + grading DB**: Matomo, LMP learner model, interview-response files (`write-interview-response.ts` stores `userInfo` from the JWT), any other logs. This plan only commits to rewrite in the two DBs named in the request.
4. **Unmapped users / incomplete CSVs / never-login:** coverage is not 100%. Email collection only touches existing `userInfo` rows. Grading/ACL-only ids stay without email until login or Phase 3b. Dual-key window starts only at 3b.
5. **JSON blobs** that may embed user ids (`courseMetadata.instructors`, possibly others): rewrite rules not specified beyond SQL columns listed above; instructors currently require `id` + `name`.
6. Whether password-signup users who never verified should later be hard-gated the same way (currently they can log in).

---

## Challenges

### 1. JWT identity ≠ database identity

IdM tokens will keep returning the 8-character id. Every authenticated request must:

1. Read JWT `user_id`.
2. Load `userInfo` where `idmId = user_id` or `userId = user_id`.
3. After the gate is on: if email is missing or `isVerified` is not true → refuse app APIs, except the allowlist (session info, submit email, resend/verify, logout).
4. Use `userInfo.userId` (the **current** PK) for writes and authorization. That is still the IdM id until the PK rewrite; it is the email only after Phase 3 apply.

Split identity is a risk **of the PK rewrite**, not of collecting emails. If rewrite has started and code skips step 2, new rows keep the JWT IdM id while rewritten rows use email.

Password tokens already have email as `user_id`; lookup can be `userId = jwt` or `email = jwt`.

### 2. Primary key change on `userInfo`

`userId` is the PK and is referenced by job-portal FKs (`studentProfile`, `recruiterProfile`, `jobPost.createdByUserId`, `jobApplication.applicantId`). Changing PK from IdM id to email requires updating **parent and children in one procedure** (typically: widen columns → disable/check FKs → update children → update `userInfo` → restore FKs). MySQL/MariaDB will not allow a simple `UPDATE userInfo.userId` while FKs point at it.

`userId VARCHAR(50)` (and other `VARCHAR(50)` / `CHAR(36)` person columns) may be **too short** for some FAU addresses. Widening must happen **before** storing emails as ids. Exact max length depends on [open item 2](#open-items).

### 3. Two databases, no distributed transaction

This matters at **PK rewrite** time (comments/user DB and grading DB), not at email verify. The rewrite helper must stay idempotent (`UPDATE … WHERE userId = :idmId`) and leftover IdM ids detectable (`userId` still equal to `idmId` in `grading`).

NAP `Answer.userId` / `Grading.checkerId` live in the **comments** DB, not the quiz grading DB. Both must be rewritten.

### 4. Dual-key window

**Email-collection / gate period:** no dual key for person columns — everyone still uses IdM `userId`. Dual key starts only when PK rewrite runs (or if verify were allowed to rewrite per user, which this plan forbids).

After PK rewrite, both forms can exist until every remaining IdM PK is rewritten. Queries that filter `WHERE userId = ?` with only the JWT id will miss rewritten users. After rewrite, invalidate ACL caches for both old and new ids.

### 5. Collision and uniqueness

Unique `email` (and unique `IdMId`) is required.

Cases:

- IdM user binds an email that is already `userInfo.userId` / `userInfo.email` (password account, another IdM user, leftover anon if not wiped first) → **reject** + support email.
- Two JWT identities must not share one `IdMId`.
- Password signup must keep rejecting FAU addresses so it does not race IdM users for the same `@fau.de` (already true for `@fau.de` only).

Merging accounts is **out of scope** (support handles it offline).

### 6. ACL, caches, and operator-entered ids

`ACLMembership.memberUserId` is a free string. Instructors/TAs may have been added as 8-character ids. Membership rows stay on that id until PK rewrite. Do not start checking ACL members by email until rewrite has run for that person.

`validateMemberAndAclIds` currently does **not** require `userInfo` rows. After this migration, adding ACL members by IdM id vs email will confuse operators unless the UI/search is updated (`get-user-suggestions` reads `userInfo`).

### 7. `isFauId` and job portal

Student vs recruiter is inferred from id shape. That must move to `IdMId IS NOT NULL` (or an explicit role). Homework/quiz “force FAU login” similarly cannot use `userId.length === 8`.

### 8. Hard gate vs existing IdM behavior

Today IdM and fake users can use the app with no verified `userInfo` email (`get-user-information` no longer forges `isVerified`). Turning the gate on without a prompt + verify allowlist **locks every IdM and `fake_xxx` user**, including those whose email was only pre-filled from CSV.

Writing IdM / `fake_xxx` ids while the gate is on is intended until PK rewrite.

Allowlist must include at least: token/user probe, persist email + send verification, verify callback, resend, logout. Listing every other public GET is not done here.

### 9. Fake users (`fake_xxx`)

Fake login must only issue 8-character ids matching `fake_xxx` (so `isFauId` / length-8 checks treat them like IdM ids). Reject other fake shapes.

They take the **same** Phase 4 path: prompt, verify, hard gate. `idmId` = `fake_xxx`. Suffix check `@fau.de` (and any later FAU allowlist) applies only when `idmId` is **not** `fake_xxx`. Collision uniqueness still applies.

Do **not** auto-provision a plus-address or set `isVerified` without the user confirming mail. Staging/CI must complete verify (or a test mailbox) like a real user.

### 10. Anonymous wipe

Wiping `_anon_` `userInfo` rows without deleting or orphaning `comments`, `Answer`, `grading`, ACL members, etc. leaves dangling ids. Wipe should cover those tables (and job-portal FKs if any `_anon_` rows exist) or leave orphans on purpose — **this plan: delete account rows and associated person-keyed rows for `_anon_` prefixes**, then remove `/anon-login` and the signup API.

### 11. Verification UX vs JWT

The existing verify link is `/verify?email=…&id=…` and keys `userInfo` by email (`verify-email.ts`). For IdM, the row’s PK stays the IdM id through verification. The verify handler must match `email` + `verificationToken` (or `idmId` + token), set `isVerified`, and **leave `userId` unchanged**.

Re-using `sendVerificationEmail` is possible; the user must be logged in via IdM when they *request* the mail, but they may open the link in another browser. Token in DB must be enough to finish verification without the IdM cookie. Next IdM login still looks up `idmId` / `userId` = JWT id.

### 12. Comments `userEmail` vs `userId`

`comments` already has `userEmail`. After migration those can drift from `userId` unless updated in the same rewrite. Anonymous **posts** (`isAnonymous`) are unrelated to `_anon_` accounts; they store null `userId` and should not be rewritten.

---

## Migration plan

### Phase 0 — Stop new anon accounts; wipe existing ones — **done in repo**

`/anon-login` redirects to `/login`. Signup API removed. Wipe script: `SCRIPT_NAME=wipeAnonAccounts` (`WIPE_ANON_APPLY=1` to delete).

### Phase 1 — Schema (comments/user DB) — **done in repo (apply migration on the DB)**

Migration `20260919170000_add_idmid_widen_user_ids`: widen person-id columns to `VARCHAR(255)`, add unique nullable `idmId` and unique `email`, backfill `idmId = userId` for IdM-shaped / fake / no-password non-email rows.

Apply with `pnpm prisma:migrate-dev` or `pnpm prisma:migrate-deploy`. Duplicate non-null emails will fail the unique index.

### Phase 2 — Identity helper — **done in repo (no hard gate yet)**

**Must ship before the bulk rewrite goes live.** After rewrite, JWT is still the IdM id; APIs must load `userInfo` where `idmId = jwt` (or `userId = jwt` if not rewritten yet) and use `userInfo.userId`.

- Do **not** `INSERT userInfo(userId = jwt)` after a user has been rewritten (second row / split identity). Upserts match by `idmId` or existing `userId`.
- Return canonical `userInfo.userId` (email after rewrite; IdM id before).
- Stop treating FAU_IDM as automatically `isVerified` in `get-user-information`.
- Server “is this an IdM user?” uses `userInfo.idmId`, not `isFauId(canonicalUserId)`.
- **Hard gate is not on in this phase.** Enabling it before the email prompt + verify allowlist would lock all current IdM users.

LMP `/getuserinfo` is unchanged. Browser `getUserInfo()` still sees the JWT id until a later client change.

### Phase 3a — Pre-fill `userInfo.email` from mappings (no PK change) — **next data step**

Goal: put an email on IdM rows that **already exist** in `userInfo`, without rewriting ids.

1. Load CSVs (`Login`/`E-Mail` + `additional_mappings.csv`).
2. `UPDATE userInfo SET email = :mapped` only when the mapping address is `@fau.de`, `idmId` or `userId` is the Login, the row is not verified, and that address is not already used by another row. Empty `email` is filled. If the DB already has a **different** address: keep `@fau.de` (log both addresses); overwrite non-`@fau.de` only when the mapping address is `@fau.de`. Mapping addresses that are not `@fau.de` are skipped (`mapping_not_fau_de`) and listed in the fill report.
3. Do **not** set `isVerified`. Do **not** change `userId`. Do **not** INSERT `userInfo` for grading/ACL-only people. Do **not** run `REWRITE_IDM_APPLY=1`.
4. Script: `SCRIPT_NAME=fillIdmEmailsFromMapping` (set `FILL_IDM_EMAIL_APPLY=1` to write). Do **not** use `REWRITE_IDM_APPLY=1` / `rewriteIdmUsersFromMapping` for this.

`SCRIPT_NAME=rewriteIdmUsersFromMapping` stays in the repo for Phase 3b. Dry-run is fine; **do not apply**.

### Phase 3b — Bulk PK rewrite IdM id → email — **deferred**

Run when most IdM users who log in have verified email.

Uses `rewriteIdmIdToEmail` / `SCRIPT_NAME=rewriteIdmUsersFromMapping` with `REWRITE_IDM_APPLY=1`.

1. Prefer `userInfo.email` where `isVerified` (user-confirmed). Mapping is fallback only for rows that still have no verified email (operator decision; collisions still skip).
2. Skip emails taken by another account.
3. Rewrite `userInfo.userId` and inventory columns in comments DB + `grading.userId`. INSERT `userInfo` only if still missing and an email source exists.
4. Recompute ACL memberships.
5. Dry-run first. Phase 2 helper must already be live (it is, in repo).

### Phase 4 — Gate + email collect/verify — **after 3a (or with empty pre-fill)**

1. UI prompt for email (pre-fill `userInfo.email` if present from 3a; user may change it). Real IdM: FAU address. `fake_xxx`: any address.
2. Persist `email` + `verificationToken`. PK stays IdM / `fake_xxx` id. Collision → support address.
3. Send verification email.
4. Verify endpoint: match token + email, set `isVerified`. **Do not** call the PK rewrite helper.
5. `getUserIdOrSetError` (except allowlist) refuses IdM / `fake_xxx` users who are not verified.

### Phase 5 — Fake id shape (`fake_xxx`)

Constrain fake login so new ids are only `fake_xxx` (8 characters). Existing non-conforming fake ids are not in scope here unless they still log in — then they fail the shape check.

Ship with Phase 4 (suffix exception + same gate). No auto-verify.

### Phase 6 — `email` NOT NULL / cleanup

Keep `email` nullable in SQL for pre-prompt IdM rows. Product rule: verified users have email. Grep leftover `isFauId` / JWT-as-DB-key. Monitor `userInfo` where `idmId` is set and `userId = idmId`.

### Suggested order

1. Phase 0–1 (schema applied on the target DB) — **done**.
2. Phase 2 helper — **done in repo** (no gate).
3. **Phase 3a** fill `userInfo.email` from mapping (unverified, existing rows only).
4. **Phase 4** gate + prompt + verify (no PK rewrite), together with **Phase 5** (`fake_xxx` only; `@fau.de` not required).
5. **Phase 3b** bulk PK rewrite when verified-email coverage is good enough.

---

## Out of scope (explicit)

- Changing Shibboleth, eduGAIN, shibd, or LMP JWT issuance / `/getuserinfo` payload.
- Automatic account merge on email collision.
- Prisma for the quiz grading database.
- Renaming the comments database in infrastructure (the schema is already the user/ACL/comments store).

---

## Inventory for the rewrite helper

When `idmId` `:old` becomes email `:new`, update `:old` → `:new` in:

**Comments DB:** `userInfo.userId` (last, with FKs); `ACLMembership.memberUserId`; `Answer.userId`; `Grading.checkerId`; `comments.userId` (and `comments.userEmail` if it equals `:old` or should follow `:new`); `StudyBuddyUsers.userId`; `StudyBuddyConnections.senderId` / `receiverId`; `announcement.instructorId`; `excused.userId`; `homework.updaterId`; `homeworkHistory.updaterId`; `courseMetadata.updaterId`; `semesterInfo.userId`; `notifications.userId`; `points.userId` / `granterId`; `updateHistory.ownerId` / `updaterId`; `CheatSheet.userId` / `uploadedByUserId`; `CheatSheetHistory.uploadedByUserId`; `CourseMaterials.uploadedBy`; `BlogPosts.authorId` if that table is in use; job-portal user id columns listed above; `orgInvitations.inviteruserId` if stored as a person id.

**Grading DB:** `grading.userId`.

Re-run until zero hits for `:old`. Composite PKs (`StudyBuddyConnections`, `StudyBuddyUsers`) can collide if two ids rewrite onto one email — should not happen if email uniqueness holds; if it does, stop and send to support (same as collision policy).