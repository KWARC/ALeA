# Email as `userId`: challenges and migration plan

This document describes how to make the application’s canonical `userId` always be an email address, while **IdM JWT issuance stays unchanged** (Shibboleth / eduGAIN / LMP `getuserinfo` continue to return the existing IdM identifier).

It does not specify implementation code. Items that are not decided are listed under [Open items](#open-items).

## Confirmed decisions

| Topic | Decision |
| --- | --- |
| IdM JWT `user_id` | Unchanged. Token still carries the IdM id (typically 8 characters, e.g. `ym23eqaw`). |
| Canonical `userId` in this app’s DBs/APIs | Email, obtained by looking up `userInfo` via `idmId` (the JWT `user_id`). |
| Historical rows (mapped users) | **Bulk rewrite** using `student_data/` mappings. Those emails are treated as **already verified**. Script creates missing `userInfo` rows, sets `email` / `isVerified`, then rewrites person-keyed columns (comments DB **and** grading DB) from IdM id → email. |
| Historical rows (unmapped users) | Stay on the IdM id until the user submits a FAU email and verifies. The **same rewrite helper** as the bulk script then runs from the verify API. |
| Email allowed for IdM users | FAU email only. This repo today only special-cases `@fau.de` on password signup. Whether other FAU suffixes are allowed is an [open item](#open-items). |
| Email already used by another account | Reject (bulk script skips and logs; verify API rejects). User is told to email a support address. The address itself is an [open item](#open-items). |
| Fake-login test users | **Deferred.** Not required for the mapping bulk rewrite or the unmapped-user gate. Staging/CI fake login will be blocked by the gate until this is done. |
| Anonymous accounts (`_anon_` prefix) | Removed from UI/API (Phase 0). Wipe remaining rows with `wipeAnonAccounts`. |
| Hard gate | IdM users **without** a verified email cannot use authenticated APIs (allowlist: session probe, submit/verify email, logout). Mapped users skip the prompt after the bulk script. Public pages stay available. |

Password / email signup already stores `userInfo.userId = email`. That path is not being redesigned here, except where it collides with IdM binding (unique email, support process).

---

## Current state (from this repo)

### Identity sources

1. **IdM (and fake-login)**  
   Cookie `access_token` is a JWT from the auth/LMP server. Server-side `getUserInfo` in `packages/alea-frontend/pages/api/comment-utils.ts` calls `{NEXT_PUBLIC_AUTH_SERVER_URL}/getuserinfo` with `Authorization: JWT …`. `lmpResponseToUserInfo` maps `user_id` → `userId`. That value is **not** an email for IdM (8-character id) or fake-login (`fake-…` / persona ids).

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
- `GET /api/get-user-information` treats “has no password” as `AuthProvider.FAU_IDM` and forces `isVerified: true`. So IdM users are **not** required to verify email today.
- Password login does **not** check `isVerified` (unchanged unless we decide otherwise; not in scope of the IdM hard gate).

ACL code already notes that members may not exist in `userInfo` (`acl-common-utils.ts`).

### Where `userId` is stored

**Comments / user DB** (Prisma `prisma/comments/schema.prisma`). Columns that hold a person id (names vary):

| Location | Column(s) | Notes |
| --- | --- | --- |
| `userInfo` | `userId` (PK) | `VARCHAR(50)` |
| `ACLMembership` | `memberUserId` | `VARCHAR(255)` |
| `Answer` | `userId` | |
| `Grading` (this DB, NAP homework grading) | `checkerId` | |
| `comments` | `userId` | also `userEmail` (display; may be null for anonymous posts) |
| `StudyBuddyUsers` / `StudyBuddyConnections` | `userId`, `senderId`, `receiverId` | Study Buddy also has its own `email` column |
| `announcement` | `instructorId` | |
| `excused` | `userId` | |
| `homework` / `homeworkHistory` | `updaterId` | |
| `courseMetadata` | `updaterId`; JSON `instructors[].id` | instructor ids are not a dedicated SQL column |
| `semesterInfo` | `userId` | |
| `notifications` | `userId` | |
| `points` | `userId`, `granterId` | |
| `updateHistory` | `ownerId`, `updaterId` | |
| `CheatSheet` / `CheatSheetHistory` | `userId`, `uploadedByUserId` | |
| `CourseMaterials` | `uploadedBy` | `VARCHAR(100)` |
| `BlogPosts` | `authorId` | ignored by Prisma; `VARCHAR(100)` |
| Job portal | `studentProfile.userId`, `recruiterProfile.userId`, `jobApplication.applicantId`, `jobApplicationAction.userId`, `jobPost.createdByUserId` | several are `VARCHAR(50)`; FKs to `userInfo.userId` |
| `orgInvitations` | `inviteruserId` | `CHAR(36)` |

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

After `userId` is an email, **`isFauId(userId)` is always false**. Anything that must mean “this person has an IdM account” has to use `userInfo.IdMId` (or equivalent), not the canonical `userId`.

---

## Target state

- Prisma column is `userInfo.idmId` (nullable, unique). Password-only users have `idmId` null.
- `userId` is the verified email after rewrite (password users: already true).
- **Mapped IdM users:** bulk script uses `student_data/` (`Login` = IdM id, `E-Mail` = email, plus `additional_mappings.csv`). Treat as verified; rewrite all person-keyed rows; `userInfo.userId` = email, `idmId` = Login.
- **Unmapped IdM users:** hard-gated until they enter and verify a FAU email; then the same rewrite helper runs.
- `getUserId` looks up `userInfo` by JWT id (`idmId` or, before rewrite, `userId`) and returns the **current** PK (`userId`). After rewrite that is the email. If lookup is skipped, new writes keep the JWT IdM id → **split identity**.
- Mappings fill **email + verified + rewrite**. Phase 1 already backfills `idmId` on existing `userInfo` from the 8-character `userId`. Many mapped people have grading/ACL rows but **no** `userInfo` row — the bulk script must INSERT those.

---

## Open items

These are **not** filled in by this plan:

1. **Support email** for “this FAU address is already taken”.
2. **Allowed FAU email suffixes** beyond what the code already uses (`@fau.de`).
3. **Exact fake-user email template** (placeholder `some-test-address+<fakeid>@gmail.com`). Need a local-part that is valid if `fake-id` contains characters that are illegal in an email local-part.
4. **Stores besides comments DB + grading DB**: Matomo, LMP learner model, interview-response files (`write-interview-response.ts` stores `userInfo` from the JWT), any other logs. This plan only commits to rewrite in the two DBs named in the request.
5. **Unmapped users / incomplete CSVs:** coverage is not 100%. Unmapped IdM-shaped rows stay until those users verify. Dual-key window continues until then.
6. **JSON blobs** that may embed user ids (`courseMetadata.instructors`, possibly others): rewrite rules not specified beyond SQL columns listed above; instructors currently require `id` + `name`.
7. Whether password-signup users who never verified should later be hard-gated the same way (currently they can log in).

---

## Challenges

### 1. JWT identity ≠ database identity

IdM tokens will keep returning the 8-character id. Every authenticated request must:

1. Read JWT `user_id`.
2. Load `userInfo` where `IdMId = user_id` (or, during transition, `userId = user_id` if the row is not rewritten yet).
3. If email is missing or `isVerified` is not true → refuse app APIs (hard gate), except the small allowlist (session info, submit email, resend/verify, logout).
4. If verified → use `userInfo.userId` (email) for all writes and authorization.

If step 2 is skipped and code keeps using JWT `user_id`, new grading/comments rows will stay on IdM ids after other rows were rewritten → **split identity**.

Password tokens already have email as `user_id`; lookup can be `userId = jwt` or `email = jwt`.

### 2. Primary key change on `userInfo`

`userId` is the PK and is referenced by job-portal FKs (`studentProfile`, `recruiterProfile`, `jobPost.createdByUserId`, `jobApplication.applicantId`). Changing PK from IdM id to email requires updating **parent and children in one procedure** (typically: widen columns → disable/check FKs → update children → update `userInfo` → restore FKs). MySQL/MariaDB will not allow a simple `UPDATE userInfo.userId` while FKs point at it.

`userId VARCHAR(50)` (and other `VARCHAR(50)` / `CHAR(36)` person columns) may be **too short** for some FAU addresses. Widening must happen **before** storing emails as ids. Exact max length depends on [open item 2](#open-items).

### 3. Two databases, no distributed transaction

At verification time we must update comments/user DB and grading DB. Failure of one leaves mixed keys for that person. The plan needs an idempotent rewrite (re-runnable `UPDATE … WHERE userId = :idmId`) and a way to detect leftover IdM ids (e.g. `userId` that matches `IdMId` still present in `grading`).

NAP `Answer.userId` / `Grading.checkerId` live in the **comments** DB, not the quiz grading DB. Both must be rewritten.

### 4. Dual-key window

Until a given user verifies, their existing rows use the IdM id. After rewrite, they use email. Across the population, **both forms exist at once**. Queries that filter `WHERE userId = ?` with only the JWT id will miss rewritten users; queries that only use email will miss unverified users. Authorization (ACL membership cache included) must use the canonical id **for that user at that time**, then after rewrite invalidate ACL caches for both old and new ids.

### 5. Collision and uniqueness

Unique `email` (and unique `IdMId`) is required.

Cases:

- IdM user binds an email that is already `userInfo.userId` / `userInfo.email` (password account, another IdM user, leftover anon if not wiped first) → **reject** + support email.
- Two JWT identities must not share one `IdMId`.
- Password signup must keep rejecting FAU addresses so it does not race IdM users for the same `@fau.de` (already true for `@fau.de` only).

Merging accounts is **out of scope** (support handles it offline).

### 6. ACL, caches, and operator-entered ids

`ACLMembership.memberUserId` is a free string. Instructors/TAs may have been added as 8-character ids. After a member verifies, membership rows for that person must be rewritten or ACL checks against email will fail.

`validateMemberAndAclIds` currently does **not** require `userInfo` rows. After this migration, adding ACL members by IdM id vs email will confuse operators unless the UI/search is updated (`get-user-suggestions` reads `userInfo`).

### 7. `isFauId` and job portal

Student vs recruiter is inferred from id shape. That must move to `IdMId IS NOT NULL` (or an explicit role). Homework/quiz “force FAU login” similarly cannot use `userId.length === 8`.

### 8. Hard gate vs existing IdM behavior

Today IdM users are treated as verified and can use the app with no `userInfo` email. After deploy, **all existing IdM sessions** hit the prompt. Any API that still calls `getUserId()` and writes immediately will either violate the gate or keep writing IdM ids.

Allowlist must include at least: token/user probe, persist email + send verification, verify callback, resend, logout. Listing every other public GET is not done here.

### 9. Fake users vs FAU-only email

Auto emails are not `@fau.de`. They must skip the FAU suffix check. Fake JWT ids should be stored in `IdMId` (or the column will not match its name for test users; the requested column name is still `IdMId`). Provisioning should set `email` / `userId` / `isVerified` so tests never see the IdM prompt.

### 10. Anonymous wipe

Wiping `_anon_` `userInfo` rows without deleting or orphaning `comments`, `Answer`, `grading`, ACL members, etc. leaves dangling ids. Wipe should cover those tables (and job-portal FKs if any `_anon_` rows exist) or leave orphans on purpose — **this plan: delete account rows and associated person-keyed rows for `_anon_` prefixes**, then remove `/anon-login` and the signup API.

### 11. Verification UX vs JWT

The existing verify link is `/verify?email=…&id=…` and keys `userInfo` by email (`verify-email.ts`). For IdM, the row’s PK is still the IdM id **until** verification succeeds. The verify handler cannot `WHERE userId = ?` with the email until after the PK swap; it should match `email` + `verificationToken` (and then run the rewrite).

Re-using `sendVerificationEmail` is possible; the user must be logged in via IdM when they *request* the mail, but they may open the link in another browser. Token in DB must be enough to finish verification without the IdM cookie. After that, their next IdM login looks up `IdMId` and finds the email `userId`.

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
- **Hard gate is not on in this phase.** Enabling it before the bulk script + email prompt would lock all current IdM users.

LMP `/getuserinfo` is unchanged. Browser `getUserInfo()` still sees the JWT id until a later client change.

### Phase 3 — Bulk rewrite from `student_data/` mappings — **done in repo (dry-run by default)**

Script: `SCRIPT_NAME=rewriteIdmUsersFromMapping` (set `REWRITE_IDM_APPLY=1` to write).

Uses `rewriteIdmIdToEmail` in `packages/nodejs-scripts/src/idmUserIdRewrite.ts` (same helper Phase 4 should call). Idempotent. Skips email collisions. After apply, recompute ACL memberships.

Idempotent script using the shared rewrite helper:

1. Load CSVs (`Login`/`E-Mail` member exports + `additional_mappings.csv`).
2. Skip mapping conflicts and emails that already belong to another `userInfo` row (log for support).
3. For each Login → email: INSERT/UPDATE `userInfo` (`idmId` = Login, `email` = email, `isVerified` = true, `userId` = email after child-row updates). Create `userInfo` when the person only appears in grading/ACL.
4. Rewrite inventory columns in comments DB + `grading.userId`.
5. Invalidate ACL cache for old and new ids.
6. Dry-run first.

### Phase 4 — Gate + email collect/verify for unmapped users

1. UI prompt for FAU email.
2. Persist `email` + `verificationToken` (PK still IdM id until verify). Collision → support address.
3. Send verification email.
4. Verify endpoint: match token + email, set `isVerified`, run **the same rewrite helper** as Phase 3.
5. `getUserIdOrSetError` (except allowlist) refuses IdM users who are not verified.

### Phase 5 — Fake users (deferred)

Plus-address auto-provision + rewrite when the gate would break staging/CI.

### Phase 6 — `email` NOT NULL / cleanup

Keep `email` nullable in SQL for pre-prompt IdM rows. Product rule: verified users have email. Grep leftover `isFauId` / JWT-as-DB-key. Monitor `userInfo` where `idmId` is set and `userId = idmId`.

### Suggested order of deploy

1. Phase 0–1 (schema applied on the target DB).
2. **Phase 2 helper** — no gate.
3. **Phase 3 bulk script** (dry-run, then apply).
4. **Phase 4** gate + prompt + verify API (same rewrite helper).
5. Fake users when the gate would break tests.

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
