# Email as `userId`: challenges and migration plan

This document describes how to make the application’s canonical `userId` always be an email address, while **IdM JWT issuance stays unchanged** (Shibboleth / eduGAIN / LMP `getuserinfo` continue to return the existing IdM identifier).

It does not specify implementation code. Items that are not decided are listed under [Open items](#open-items).

## Confirmed decisions

| Topic | Decision |
| --- | --- |
| IdM JWT `user_id` | Unchanged. Token still carries the IdM id (typically 8 characters, e.g. `ym23eqaw`). |
| Canonical `userId` in this app’s DBs/APIs | Email, obtained by looking up `userInfo` via `IdMId` (the JWT `user_id`). |
| Historical rows | Rewrite stored `userId` values from IdM id → email (comments/user DB **and** grading DB). |
| Email allowed for IdM users | FAU email only. This repo today only special-cases `@fau.de` (password signup is blocked for that suffix). Whether other FAU suffixes are allowed is an [open item](#open-items). |
| Email already used by another account | Reject. User is told to email a support address to resolve it. The address itself is an [open item](#open-items). |
| Fake-login test users | Do **not** add an email-prompt gate. Use the simplest auto-provisioning, e.g. a hardcoded plus-address `some-test-address+<fakeid>@gmail.com` (exact local-part/domain is an [open item](#open-items)). This is an explicit exception to “FAU email only”. |
| Anonymous accounts (`_anon_` prefix) | Not linked from the main login page. `/anon-login` and `POST /api/anon-login/signup` still exist and are reachable by URL. Treat as unsupported: remove the UI/API and wipe those accounts. |
| Hard gate | IdM users cannot continue using the authenticated app until a FAU email is entered and verified. Public/unauthenticated pages stay available. |

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

- Every real user has a `userInfo` row.
- `email` is mandatory (and should be unique; otherwise collision handling cannot be implemented).
- New column `IdMId`: the identifier from the IdM/fake JWT (`user_id`), unique when present. Password-only users have `IdMId` null.
- `userId` is the verified email (password users: already true; IdM users: after verification).
- IdM users: prompt for FAU email → send existing-style verification mail → set `isVerified` → then rewrite historical `userId`s and change `userInfo.userId` to that email.
- Authenticated API usage for IdM users is blocked until that verification completes. `getUserId` (or a successor) must not return an unverified IdM id as if it were the canonical email `userId`.

---

## Open items

These are **not** filled in by this plan:

1. **Support email** for “this FAU address is already taken”.
2. **Allowed FAU email suffixes** beyond what the code already uses (`@fau.de`).
3. **Exact fake-user email template** (placeholder `some-test-address+<fakeid>@gmail.com`). Need a local-part that is valid if `fake-id` contains characters that are illegal in an email local-part.
4. **Stores besides comments DB + grading DB**: Matomo, LMP learner model, interview-response files (`write-interview-response.ts` stores `userInfo` from the JWT), any other logs. This plan only commits to rewrite in the two DBs named in the request.
5. **Users who never return** after deploy: their rows stay keyed by IdM id until they verify. There is **no** email in the IdM JWT in this project, so a one-shot SQL rewrite of all historical IdM ids is impossible. “Rewrite all” applies **per user at verification time** (and any admin/script that has a known mapping).
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

### Phase 0 — Stop new anon accounts; wipe existing ones

1. Remove or disable `/anon-login` and `POST /api/anon-login/signup`.
2. Delete `_anon_`-prefixed `userInfo` and person-keyed rows in comments DB and grading DB (same prefix).
3. Confirm no UI entry point remains.

### Phase 1 — Schema (comments/user DB) before behavior change

1. Widen person-id columns that are shorter than the chosen email max (at least `userInfo.userId` and job-portal FK columns; `orgInvitations.inviteruserId` is `CHAR(36)` and is not a safe email container).
2. Add `userInfo.IdMId` (`VARCHAR`, nullable, **unique**).
3. Enforce unique `email` where `email` is not null (then later `email` NOT NULL).
4. Backfill:
   - Password users: leave `userId`/`email` as now; `IdMId` null.
   - Existing IdM-shaped rows (`isFauId(userId)` or no `saltedPassword` and no `@` in `userId`): set `IdMId = userId`. Do not change `userId` yet.
   - Fake ids: set `IdMId` to current `userId`; optionally set placeholder email/`userId` in Phase 3.
5. Prisma migrate the comments schema. Grading DB: no new columns; still only `userId`.

Do **not** make `email` NOT NULL until every remaining row has an email (anon gone; IdM filled at first login/prompt).

### Phase 2 — Identity helper (behavior)

Replace “JWT `user_id` is `userId`” with:

- Resolve JWT id → `userInfo` by `IdMId` or `userId`.
- If no row: create `userInfo` with `IdMId = jwt user_id`, `userId` still the jwt id **or** a temporary placeholder — but **do not** write quiz/comments/ACL as if the user were fully migrated. Hard gate applies.
- Return canonical email `userId` only when `email` is set and `isVerified`.
- IdM + unverified: APIs (except allowlist) return an error the UI uses to show the email prompt (exact HTTP code not specified here; existing auth failures use 401/403).
- Stop treating FAU_IDM as automatically `isVerified` in `get-user-information`.
- Stop using `isFauId(canonicalUserId)` for authorization/UX; use presence of `IdMId`.

LMP `/getuserinfo` is unchanged.

### Phase 3 — Fake users (simplest path)

On fake-login resolution:

- Ensure `userInfo` with `IdMId = fake jwt id`, `email`/`userId` = agreed plus-address, `isVerified = true`.
- Rewrite any existing rows from fake id → that email (same rewrite helper as IdM, so tests do not keep two keys).
- Skip FAU-domain check and skip UI prompt.

### Phase 4 — IdM email collect + verify

1. UI prompt for FAU email (suffix rule per open item).
2. Persist `email` + `verificationToken` on the existing `userInfo` row (PK still IdM id). Reject if email unique constraint fails → show “contact support at \<TBD\>”.
3. Send verification email (reuse `sendVerificationEmail` pattern).
4. Verify endpoint: match token + email, set `isVerified`, then run **rewrite job** for that `IdMId`:
   - Update all listed SQL columns in comments DB from old id → email.
   - `UPDATE grading SET userId = :email WHERE userId = :idmId` on grading DB.
   - Update `courseMetadata.instructors` JSON ids if they equal the old id (if we include JSON in rewrite; otherwise document leftover).
   - Change `userInfo.userId` to email (FK-safe order).
   - `email` stays the same address (`userId` and `email` match).
   - Invalidate ACL cache for old and new ids.
5. Job must be idempotent.

Until step 4, hard gate remains.

### Phase 5 — Make `email` mandatory

When no `userInfo` row lacks `email` (except any leftover never-login IdM rows you accept):

- `email` NOT NULL.
- Application always creates `userInfo` on first IdM login (before prompt), with `email` still null **or** you keep email nullable until they submit — **NOT NULL cannot apply to in-progress IdM users**. Practical approach: nullable until they submit the address (minutes later), then NOT NULL is only possible if unverified IdM rows store a dummy, which we are **not** assuming. So **database NOT NULL on `email` applies only after we decide unverified IdM users may not have a row, or we allow NULL until verified**.  

**Constraint without assuming a dummy email:** keep `email` nullable in SQL for unverified IdM users; enforce “mandatory” in the product (hard gate) and treat “every *verified* user has email” as the invariant. Making the column NOT NULL for all rows conflicts with “prompt then verify” unless we insert email at prompt time (before verify). **At prompt time** we can set `email` (unverified) and then NOT NULL is viable for users who have submitted an address; users who have not submitted still have NULL. Full-table `email NOT NULL` is only valid if we **create no `userInfo` row until the address is submitted**, which conflicts with “row for each user” if “each user” includes pre-prompt IdM sessions.

**Resolution aligned with stated goals:** create `userInfo` on first IdM login (`IdMId` set, `email` null allowed in DB); set `email` when they submit; verified later. Do **not** claim a DB-level `email NOT NULL` on every row until there are zero pre-prompt rows (unlikely). Product rule: email required to continue. Optional later: `CHECK`/`NOT NULL` once we no longer persist pre-prompt rows.

### Phase 6 — Cleanup

- Grep for `isFauId`, `user_id` used as DB key, `getUserId` call sites.
- Remove auto-verify for IdM.
- Confirm password signup still blocks FAU emails (at least `@fau.de`).
- Monitoring: count `userInfo` where `IdMId` is set and `userId = IdMId` (not yet rewritten); count `grading.userId` that join to `IdMId`.

### Suggested order of deploy

1. Phase 0 (anon) can ship independently.  
2. Phase 1 (columns + backfill `IdMId`) with **no** hard gate.  
3. Phase 2–4 together or 2 then 4: helper + gate + prompt, or helper first (still writing IdM ids) then gate (risk: more IdM-keyed rows). Prefer **gate as soon as lookup exists**, even if rewrite ships in the same release, so new writes after verify are emails and unverified users write nothing.  
4. Fake auto-email in the same release as the gate so CI/personas do not get stuck.

---

## Out of scope (explicit)

- Changing Shibboleth, eduGAIN, shibd, or LMP JWT issuance / `/getuserinfo` payload.
- Automatic account merge on email collision.
- Prisma for the quiz grading database.
- Renaming the comments database in infrastructure (the schema is already the user/ACL/comments store).

---

## Inventory for the rewrite helper

When `IdMId` `:old` becomes email `:new`, update `:old` → `:new` in:

**Comments DB:** `userInfo.userId` (last, with FKs); `ACLMembership.memberUserId`; `Answer.userId`; `Grading.checkerId`; `comments.userId` (and `comments.userEmail` if it equals `:old` or should follow `:new`); `StudyBuddyUsers.userId`; `StudyBuddyConnections.senderId` / `receiverId`; `announcement.instructorId`; `excused.userId`; `homework.updaterId`; `homeworkHistory.updaterId`; `courseMetadata.updaterId`; `semesterInfo.userId`; `notifications.userId`; `points.userId` / `granterId`; `updateHistory.ownerId` / `updaterId`; `CheatSheet.userId` / `uploadedByUserId`; `CheatSheetHistory.uploadedByUserId`; `CourseMaterials.uploadedBy`; `BlogPosts.authorId` if that table is in use; job-portal user id columns listed above; `orgInvitations.inviteruserId` if stored as a person id.

**Grading DB:** `grading.userId`.

Re-run until zero hits for `:old`. Composite PKs (`StudyBuddyConnections`, `StudyBuddyUsers`) can collide if two ids rewrite onto one email — should not happen if email uniqueness holds; if it does, stop and send to support (same as collision policy).
