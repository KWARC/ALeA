# Email as `userId`: challenges and migration plan

This document describes how to make the application’s canonical `userId` always be an email address, while **IdM JWT issuance stays unchanged** (Shibboleth / eduGAIN / LMP `getuserinfo` continue to return the existing IdM identifier).

It does not specify implementation code. Items that are not decided are listed under [Open items](#open-items).

## Confirmed decisions


| Topic                                     | Decision                                                                                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IdM JWT `user_id`                         | Unchanged. Token still carries the IdM id (typically 8 characters, e.g. `ym23eqaw`).                                                                                                                                                            |
| Canonical `userId` in this app’s DBs/APIs | **Eventually** email. Until the PK rewrite, IdM rows keep `userId` = IdM id. Lookup is still `userInfo` via `idmId` (JWT `user_id`) or `userId`.                                                                                                |
| Emails on existing `userInfo` (now)       | Collect onto `userInfo.email` only. Do **not** change `userId` or other person-keyed columns. Mapping CSVs that write a `@fau.de` address also set `isVerified` (mappings are treated as correct). |
| Historical person-keyed rows              | Stay on the IdM id until a later bulk PK rewrite (Phase 3 apply), after most IdM users have a **verified** email.                                                                                                                               |
| Verify API                                | Sets `email` + `isVerified` only. Does **not** rewrite `userId` to email until that later bulk step.                                                                                                                                            |
| Email allowed for IdM users               | Real IdM: FAU email only. This repo today only special-cases `@fau.de` on password signup. Whether other FAU suffixes are allowed is an [open item](#open-items). **`fake_xxx` `idmId`s:** any verifiable email; `@fau.de` is **not** required. |
| Email already used by another account     | Reject (fill/rewrite skips and logs; verify API rejects). User is told to email a support address. The address itself is an [open item](#open-items).                                                                                           |
| Mapping vs verified email                 | Never overwrite a row that already has `isVerified`. If the user confirms a different address than the CSV, keep the verified one.                                                                                                              |
| Fake-login test users                     | Allowed ids are **exactly 8 characters** and match `fake_xxx` (FAU-shaped, e.g. `fake_abc`). Same email collect + verify **page** as IdM (`idmId` stored). They do **not** auto-verify and do **not** skip the redirect.                      |
| Anonymous accounts (`_anon_` prefix)      | Removed from UI/API (Phase 0). Wipe remaining rows with `wipeAnonAccounts`.                                                                                                                                                                     |
| Email collect UX                          | **Client redirect.** Logged-in IdM / `fake_xxx` users whose email is missing, unverified, or (real IdM) not `@fau.de` go to a dedicated page to set email and/or wait for the verify link. Authenticated APIs stay usable. |


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
- `GET /api/get-user-information` no longer forges `isVerified` for IdM. It does not return `email` today. Unverified IdM users can use APIs; Phase 4 only redirects in the UI.
- Password login does **not** check `isVerified` (unchanged).

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
- **Email collection:** IdM / `fake_xxx` users who load the UI are redirected until `userInfo.email` is set, `@fau.de` for real IdM, and `isVerified`. Mapped `@fau.de` addresses from `student_data/` are stored **and** marked verified. APIs are not blocked.
- People who appear only in grading/ACL and never log in still have **no** `userInfo` email until they log in (Phase 4) or until a later rewrite script INSERTs from mapping — that INSERT is **not** part of the email-collection step.

---

## Open items

These are **not** filled in by this plan:

1. **Support email** for “this FAU address is already taken”.
2. **Allowed FAU email suffixes** beyond what the code already uses (`@fau.de`) for **real** IdM users.
3. **Stores besides comments DB + grading DB**: Matomo, LMP learner model, interview-response files (`write-interview-response.ts` stores `userInfo` from the JWT), any other logs. This plan only commits to rewrite in the two DBs named in the request.
4. **Unmapped users / incomplete CSVs / never-login:** coverage is not 100%. Email collection only touches existing `userInfo` rows. Grading/ACL-only ids stay without email until login or Phase 3b. Dual-key window starts only at 3b.
5. **JSON blobs** that may embed user ids (`courseMetadata.instructors`, possibly others): rewrite rules not specified beyond SQL columns listed above; instructors currently require `id` + `name`.
6. Whether password-signup users who never verified should later get the same collect page (currently they can use the app).

---

## Challenges

### 1. JWT identity ≠ database identity

IdM tokens will keep returning the 8-character id. Every authenticated request must:

1. Read JWT `user_id`.
2. Load `userInfo` where `idmId = user_id` or `userId = user_id`.
3. Use `userInfo.userId` (the **current** PK) for writes and authorization. That is still the IdM id until the PK rewrite; it is the email only after Phase 3b.

Split identity is a risk **of the PK rewrite**, not of collecting emails. If rewrite has started and code skips step 2, new rows keep the JWT IdM id while rewritten rows use email.

Password tokens already have email as `user_id`; lookup can be `userId = jwt` or `email = jwt`.

### 2. Primary key change on `userInfo`

`userId` is the PK and is referenced by job-portal FKs (`studentProfile`, `recruiterProfile`, `jobPost.createdByUserId`, `jobApplication.applicantId`). Changing PK from IdM id to email requires updating **parent and children in one procedure** (typically: widen columns → disable/check FKs → update children → update `userInfo` → restore FKs). MySQL/MariaDB will not allow a simple `UPDATE userInfo.userId` while FKs point at it.

`userId VARCHAR(50)` (and other `VARCHAR(50)` / `CHAR(36)` person columns) may be **too short** for some FAU addresses. Widening must happen **before** storing emails as ids. Exact max length depends on [open item 2](#open-items).

### 3. Two databases, no distributed transaction

This matters at **PK rewrite** time (comments/user DB and grading DB), not at email verify. The rewrite helper must stay idempotent (`UPDATE … WHERE userId = :idmId`) and leftover IdM ids detectable (`userId` still equal to `idmId` in `grading`).

NAP `Answer.userId` / `Grading.checkerId` live in the **comments** DB, not the quiz grading DB. Both must be rewritten.

### 4. Dual-key window

**Email-collection period:** no dual key for person columns — everyone still uses IdM `userId`. Dual key starts only when PK rewrite runs.

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

### 8. UI redirect vs APIs

Phase 4 is a **browser redirect**, not an API deny. `getUserIdOrSetError` stays as today. Users who never hit the UI (scripts, leftover tabs that skip the check) can still call APIs with an unverified IdM id.

Existing client bits: `UserContextProvider` loads LMP `getUserInfo()` once (JWT id only). `getUserInformation()` hits `/api/get-user-information` and caches forever; it has `isVerified` / `authProvider` but not `email`. `_app.tsx` polls only for build id. Phase 4 adds `email` to that API and a route-level check; no global poll.

### 9. Fake users (`fake_xxx`)

Fake login must only issue 8-character ids matching `fake_xxx`. Reject other fake shapes.

They take the **same** Phase 4 page. `idmId` = `fake_xxx`. `@fau.de` is not required. Collision uniqueness still applies.

Do **not** auto-provision a plus-address or set `isVerified` without confirming mail.

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

### Phase 2 — Identity helper — **done in repo**

**Must ship before the bulk rewrite goes live.** After rewrite, JWT is still the IdM id; APIs must load `userInfo` where `idmId = jwt` (or `userId = jwt` if not rewritten yet) and use `userInfo.userId`.

- Do **not** `INSERT userInfo(userId = jwt)` after a user has been rewritten (second row / split identity). Upserts match by `idmId` or existing `userId`.
- Return canonical `userInfo.userId` (email after rewrite; IdM id before).
- Stop treating FAU_IDM as automatically `isVerified` in `get-user-information`.
- Server “is this an IdM user?” uses `userInfo.idmId`, not `isFauId(canonicalUserId)`.

LMP `/getuserinfo` is unchanged. Browser `getUserInfo()` still sees the JWT id until a later client change.

### Phase 3a — Pre-fill `userInfo.email` from mappings (no PK change) — **next data step**

Goal: put an email on IdM rows that **already exist** in `userInfo`, without rewriting ids.

1. Load CSVs (`Login`/`E-Mail` + `additional_mappings.csv`).
2. `UPDATE userInfo SET email = :mapped, isVerified = 1` only when the mapping address is `@fau.de`, `idmId` or `userId` is the Login, the row is not verified (or the email already matches the mapping), and that address is not already used by another row. Empty `email` is filled. If the DB already has a **different** address: keep `@fau.de` (log both addresses, do not flip verified from mapping); overwrite non-`@fau.de` only when the mapping address is `@fau.de`. Mapping addresses that are not `@fau.de` are skipped (`mapping_not_fau_de`) and listed in the fill report. Re-run marks rows whose email already matches the mapping as verified.
3. Do **not** change `userId`. Do **not** INSERT `userInfo` for grading/ACL-only people. Do **not** run `REWRITE_IDM_APPLY=1`.
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

### Phase 4 — Collect/verify page (client redirect) — **done in repo**

No API deny for unverified users.

**When to fetch:** on app load and on client route change, call `/api/get-user-information` (must include `email`, `isVerified`, `authProvider` / IdM vs password). Do **not** poll the whole app. On the collect/verify page only, poll every ~5–10s so a verify click in another tab is noticed without a manual refresh. Invalidate the existing `getUserInformation()` cache after submit/resend/verify.

**Who is redirected** (while `userId` is still the IdM id; later use `authProvider === FAU_IDM` or `idmId`, not `isFauId(userId)`):

Logged in, IdM or `fake_xxx`, and any of: `email` empty; `isVerified` false; real IdM email not `@fau.de`.

Password users (`userId` is already an email) are not redirected.

**Exempt routes** so there is no loop: the collect page, `/verify`, `/login`, and unauthenticated public pages.

**Collect page:**

1. Show current `email` if Phase 3a pre-filled it. User may change it. Real IdM: require `@fau.de`. `fake_xxx`: any address.
2. Save `email` + `verificationToken` on the existing row (`userId` unchanged). Collision → support address.
3. Send the existing-style mail (`/verify?email=…&id=…`). Copy: check inbox / resend.
4. Verify handler: match `email` + token (or `idmId` + token), set `isVerified`, **do not** rewrite `userId`. After success, leave the collect page.

CSV `@fau.de` fill **does** skip this page (`isVerified` is set by Phase 3a). Unmapped users still land here.

### Phase 5 — Fake id shape (`fake_xxx`) — **done in repo**

Constrain fake login so new ids are only `fake_xxx` (8 characters). Existing non-conforming fake ids fail the shape check if they still log in.

Ship with Phase 4 (`@fau.de` not required). No auto-verify.

### Phase 6 — `email` NOT NULL / cleanup

Keep `email` nullable in SQL for IdM rows that have not verified yet. Product rule: users who complete the collect page have email. Grep leftover `isFauId` / JWT-as-DB-key. Monitor `userInfo` where `idmId` is set and `userId = idmId`.

### Suggested order

1. Phase 0–1 (schema applied on the target DB) — **done**.
2. Phase 2 helper — **done in repo**.
3. **Phase 3a** fill `userInfo.email` from mapping (unverified, existing rows only).
4. **Phase 4** collect/verify **page** (redirect, no API gate) with **Phase 5** (`fake_xxx` only; `@fau.de` not required).
5. **Phase 3b** bulk PK rewrite when verified-email coverage is good enough.

---

## Out of scope (explicit)

- Changing Shibboleth, eduGAIN, shibd, or LMP JWT issuance / `/getuserinfo` payload.
- Refusing authenticated APIs for unverified IdM users.
- Automatic account merge on email collision.
- Prisma for the quiz grading database.
- Renaming the comments database in infrastructure (the schema is already the user/ACL/comments store).

---

## Inventory for the rewrite helper

When `idmId` `:old` becomes email `:new`, update `:old` → `:new` in:

**Comments DB:** `userInfo.userId` (last, with FKs); `ACLMembership.memberUserId`; `Answer.userId`; `Grading.checkerId`; `comments.userId` (and `comments.userEmail` if it equals `:old` or should follow `:new`); `StudyBuddyUsers.userId`; `StudyBuddyConnections.senderId` / `receiverId`; `announcement.instructorId`; `excused.userId`; `homework.updaterId`; `homeworkHistory.updaterId`; `courseMetadata.updaterId`; `semesterInfo.userId`; `notifications.userId`; `points.userId` / `granterId`; `updateHistory.ownerId` / `updaterId`; `CheatSheet.userId` / `uploadedByUserId`; `CheatSheetHistory.uploadedByUserId`; `CourseMaterials.uploadedBy`; `BlogPosts.authorId` if that table is in use; job-portal user id columns listed above; `orgInvitations.inviteruserId` if stored as a person id.

**Grading DB:** `grading.userId`.

Re-run until zero hits for `:old`. Composite PKs (`StudyBuddyConnections`, `StudyBuddyUsers`) can collide if two ids rewrite onto one email — should not happen if email uniqueness holds; if it does, stop and send to support (same as collision policy).