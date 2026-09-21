# Email as `userId`: challenges and migration plan

Child of **[idm-to-cdi-migration.md](./idm-to-cdi-migration.md)** (IdM tokens → Cdi tokens). This document is the **pre-switch** work: bind **verified** email onto IdM-keyed `userInfo` (CSV fill **and** user collect) so production already has the email ↔ `idmId` mapping.

**Phase 6** (the switch: rewrite `userId` to email from **prod DB**, not CSVs) is specified **only** in the parent. This child does **not** change `userId`.

This document describes how the application binds people to email on `userInfo`, while **IdM JWT issuance stays unchanged** (Shibboleth / eduGAIN / LMP `getuserinfo` continue to return the existing IdM identifier).

Phases 0–5 are **done and on production**. Remaining **in this child:** keep collecting/verifying email, and **fill `userInfo.email` from CSVs** onto existing rows (pre-switch fill below). Schema `cdiId` / `unverifiedUsers` and all `userId` re-keying are in the parent ([implementation phases](./idm-to-cdi-migration.md#implementation-phases)).

Items that are not decided are listed under [Open items](#open-items).

## Confirmed decisions

| Topic                                     | Decision                                                                                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IdM JWT `user_id`                         | Unchanged. Token still carries the IdM id (typically 8 characters, e.g. `ym23eqaw`).                                                                                                                                                            |
| Canonical `userId` in this app’s DBs/APIs | IdM rows keep `userId` = IdM id. Lookup is `userInfo` via `idmId` (JWT `user_id`) or `userId`. Password signup already uses `userId` = email.                                                                                                   |
| Emails on existing `userInfo`             | Stored on `userInfo.email`. Person-keyed columns stay the IdM id. Mapping CSVs that write a `@fau.de` address also set `isVerified` (mappings are treated as correct).                                                                          |
| Verify API                                | Sets `email` + `isVerified` only. Does **not** rewrite `userId`.                                                                                                                                                                                |
| Email allowed for IdM users               | Real IdM: FAU email only (`@fau.de` in this repo). Whether other FAU suffixes are allowed is an [open item](#open-items). **`fake_xxx` `idmId`s:** any verifiable email; `@fau.de` is **not** required.                                          |
| Email already used by another account     | Reject (fill skips and logs; APIs reject). User is told to email a support address. The address itself is an [open item](#open-items).                                                                                                          |
| Mapping vs verified email                 | Never overwrite a row that already has `isVerified`. If the user confirms a different address than the CSV, keep the verified one.                                                                                                              |
| Fake-login test users                     | The login field is **exactly 3 alphanumeric characters** (e.g. `abc`). LMS / auth `fake-id` is that suffix; LMS prepends `fake_`, so JWT / `idmId` is `fake_xxx`. Same collect + verify page as IdM. They do **not** auto-verify.               |
| Anonymous accounts (`_anon_` prefix)      | Removed from UI/API (Phase 0). Wipe remaining rows with `wipeAnonAccounts`.                                                                                                                                                                     |
| Email collect UX                          | **Client redirect.** Logged-in IdM / `fake_xxx` users whose email is missing, unverified, or (real IdM) not `@fau.de` go to a dedicated page. Authenticated APIs stay usable. `/profile` and `/my-profile` are exempt.                           |
| Email change                              | Any actual change to `userInfo.email` sets `isVerified = 0` (shared helper). Real IdM users cannot save a non-`@fau.de` address (profile edit and collect page).                                                                                |


Password / email signup already stores `userInfo.userId = email`. That path is not being redesigned here, except where it collides with IdM binding (unique email, support process).

---

## Current state (from this repo, on production)

### Identity sources

1. **IdM (and fake-login)**
   Cookie `access_token` is a JWT from the auth/LMP server. Server-side `getUserId` / `getUserInfo` in `packages/alea-frontend/pages/api/comment-utils.ts` resolve JWT `user_id` to `userInfo` by `idmId` or `userId`. That JWT value is **not** an email for IdM (8-character id). Fake login accepts a 3-character suffix; the issued id is `fake_xxx`.
2. **Username/password**
  `packages/alea-frontend/pages/api/login.ts` checks `userInfo` by `userId`, then asks LMP for a token via `/get-email-access-token?email=${userId}`. Signup inserts `userId` and `email` as the same address (`packages/alea-frontend/pages/api/signup.ts`). `@fau.de` is rejected so FAU users are sent to IdM.
3. **Anonymous**
  Removed. `userId` used to be `_anon_<personality>_<animal>`.

### `userInfo` today

Prisma model `userInfo` (comments / “user” MySQL database):

- `userId` is the primary key (`VARCHAR(255)` after Phase 1).
- Unique nullable `idmId` and unique `email`.
- `verificationToken` / `isVerified` exist.
- IdM rows are created/updated by JWT persist (`idmId` = JWT id). Email is filled by the user on `/collect-email`, by verify, or (Phase 6) from mapping.
- `GET /api/get-user-information` returns `email`, `isVerified`, and `authProvider` (password vs IdM from presence of a password hash). It does not forge `isVerified` for IdM.
- Password login does **not** check `isVerified` (unchanged).

ACL code already notes that members may not exist in `userInfo` (`acl-common-utils.ts`).

### Where `userId` is stored

**Comments / user DB** (Prisma `prisma/comments/schema.prisma`). Columns that hold a person id (names vary):


| Location                                    | Column(s)                                                                                                                                  | Notes                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `userInfo`                                  | `userId` (PK), `idmId`, `email`                                                                                                            | `VARCHAR(255)`                                              |
| `ACLMembership`                             | `memberUserId`                                                                                                                             |                                                             |
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
| `CourseMaterials`                           | `uploadedBy`                                                                                                                               |                                                             |
| `BlogPosts`                                 | `authorId`                                                                                                                                   | ignored by Prisma                                           |
| Job portal                                  | `studentProfile.userId`, `recruiterProfile.userId`, `jobApplication.applicantId`, `jobApplicationAction.userId`, `jobPost.createdByUserId` | FKs to `userInfo.userId`                                    |
| `orgInvitations`                            | `inviteruserId`                                                                                                                            |                                                             |


**Grading DB** (no Prisma; `sql/grading_database_setup.sql`): table `grading.userId VARCHAR(255)`. Quiz responses are inserted with `getUserIdOrSetError` (`insert-quiz-response.ts`). Separate connection from the comments DB; **no shared transaction**.

**Not in these two DBs (called out, not assumed in-scope):**

- LMP/auth `getuserinfo` and learner-model data keyed by JWT `user_id`.
- Matomo `matomo_log_visit.user_id` (`user-anon-data.ts`, tracker in `_app.tsx`).
- ACL membership **cache** (Redis/set keyed by user id in `CACHE_STORE`).
- Client caches (`cachedUserInfo` in `spec/src/lib/lmp.ts`).

### Logic that assumes IdM id shape

`isFauId` is `id.length === 8 && !id.includes('@')` (`packages/utils/src/lib/utils.ts`). `isFakeXxxId` is `/^fake_[a-zA-Z0-9]{3}$/`. `isFakeXxxSuffix` is the 3-character login input.

`isFauId` is still used in places to:

- force FAU IdM login on homework/quiz pages;
- treat job-portal users as student vs recruiter.

While IdM `userId` remains 8 characters, those checks still match. “This person has an IdM account” must use `userInfo.idmId` (or `authProvider`), not “canonical userId is an email”.

---

## Target state (after Phase 6)

- Prisma `userInfo.idmId` is nullable unique. Password-only users have `idmId` null.
- IdM `userInfo.userId` stays the IdM id. `getUserId` returns that PK. Comments, ACL, grading stay keyed by IdM id.
- `getUserId` looks up by `idmId` / `userId` and returns the current PK.
- IdM / `fake_xxx` users who load the UI (except exempt routes) are redirected until `userInfo.email` is set, `@fau.de` for real IdM, and `isVerified`.
- Mapped `@fau.de` addresses from `student_data/` are stored **and** marked verified on **existing** `userInfo` rows (pre-switch CSV fill).
- APIs are not blocked for unverified IdM users.
- People who appear only in grading/ACL and never log in still have **no** `userInfo` email until they log in. CSV fill does **not** INSERT those rows. Parent Phase 6 then treats them as **lost**.

---

## Open items

These are **not** filled in by this plan:

1. **Support email** for “this FAU address is already taken”.
2. **Allowed FAU email suffixes** beyond what the code already uses (`@fau.de`) for **real** IdM users.
3. **Stores besides comments DB + grading DB** for the **parent Phase 6** re-key: decided there (LMS gets a mapping; ACL recompute/restart; nothing else). This child fill only writes `userInfo.email` in the comments DB.
4. **Unmapped users / incomplete CSVs / never-login:** coverage is not 100%. CSV fill only updates existing `userInfo` rows. Grading/ACL-only ids stay without email until login; at the parent switch those rows are **lost**.
5. **JSON blobs** that may embed user ids (`courseMetadata.instructors`, possibly others): not rewritten; instructors currently require `id` + `name`.
6. Whether password-signup users who never verified should get the same collect page (currently they can use the app).

---

## Challenges

### 1. JWT identity ≠ database identity

IdM tokens return the 8-character id. Every authenticated request must:

1. Read JWT `user_id`.
2. Load `userInfo` where `idmId = user_id` or `userId = user_id`.
3. Use `userInfo.userId` (the PK, still the IdM id for IdM users) for writes and authorization.

If code skips step 2 and writes JWT `user_id` as a new `userInfo.userId` after a row already exists under `idmId`, identity splits.

Password tokens already have email as `user_id`; lookup can be `userId = jwt` or `email = jwt`.

### 2. Two databases

Comments/user DB and grading DB are separate connections with **no shared transaction**. Pre-switch CSV fill only updates `userInfo` in the comments DB. Parent Phase 6 updates both DBs.

### 3. Collision and uniqueness

Unique `email` (and unique `idmId`) is required.

Cases:

- IdM user binds an email that is already `userInfo.userId` / `userInfo.email` (password account, another IdM user) → **reject** + support email.
- Two JWT identities must not share one `idmId`.
- Password signup must keep rejecting FAU addresses so it does not race IdM users for the same `@fau.de` (already true for `@fau.de` only).

Merging accounts is **out of scope** (support handles it offline).

### 4. ACL, caches, and operator-entered ids

`ACLMembership.memberUserId` is a free string. Instructors/TAs may have been added as 8-character ids. Membership stays on that id. `validateMemberAndAclIds` does **not** require `userInfo` rows. Operator search (`get-user-suggestions`) reads `userInfo`.

### 5. `isFauId` and job portal

Student vs recruiter and homework/quiz “force FAU login” still use id shape. IdM `userId` is still FAU-shaped. Prefer `idmId IS NOT NULL` (or an explicit role) where “has IdM” is the real question.

### 6. UI redirect vs APIs

Collect/verify is a **browser redirect**, not an API deny. `getUserIdOrSetError` stays as today. Users who never hit the UI can still call APIs with an unverified IdM id.

`getUserInformation()` hits `/api/get-user-information` (includes `email`). `EmailCollectGuard` runs on load and route change. Collect page polls so a verify click in another tab is noticed. Cache is invalidated after submit/resend/verify.

### 7. Fake users (`fake_xxx`)

Login accepts only a 3-character suffix. LMS prepends `fake_`. Reject other fake shapes at login and at `/api/fake-login/[fakeIdSuffix]`.

They take the **same** collect page. `idmId` = `fake_xxx`. `@fau.de` is not required. Collision uniqueness still applies.

Do **not** auto-provision a plus-address or set `isVerified` without confirming mail.

### 8. Verification UX vs JWT

The verify link is `/verify?email=…&id=…` and matches `userInfo` by **email + token**. The row’s PK stays the IdM id. The handler sets `isVerified` and **leaves `userId` unchanged**.

The user must be logged in via IdM when they *request* the mail; they may open the link in another browser. Token in DB is enough to finish verification without the IdM cookie. Next IdM login still looks up `idmId` / `userId` = JWT id.

### 9. Comments `userEmail` vs `userId`

`comments` already has `userEmail`. Anonymous **posts** (`isAnonymous`) are unrelated to `_anon_` accounts; they store null `userId`.

### 10. Email updates must unverify

Changing `userInfo.email` through profile or IdM set-email must set `isVerified = 0` (helper `setUserInfoEmailOrSetError`). Unchanged address must not flip verification.

---

## Migration plan

### Phase 0 — Stop new anon accounts; wipe existing ones — **done (prod)**

`/anon-login` redirects to `/login`. Signup API removed. Wipe script: `SCRIPT_NAME=wipeAnonAccounts` (`WIPE_ANON_APPLY=1` to delete).

### Phase 1 — Schema (comments/user DB) — **done (prod)**

Migration `20260919170000_add_idmid_widen_user_ids`: widen person-id columns to `VARCHAR(255)`, add unique nullable `idmId` and unique `email`, backfill `idmId = userId` for IdM-shaped / fake / no-password non-email rows.

### Phase 2 — Identity helper — **done (prod)**

JWT is still the IdM id. APIs load `userInfo` where `idmId = jwt` (or `userId = jwt`) and use `userInfo.userId`.

- Do **not** `INSERT userInfo(userId = jwt)` when a row already exists under `idmId`.
- Return canonical `userInfo.userId`.
- `get-user-information` does not treat FAU_IDM as automatically `isVerified`.
- Server “is this an IdM user?” uses `userInfo.idmId` (and password-hash absence), not `isFauId(canonicalUserId)` alone.

LMP `/getuserinfo` is unchanged. Browser `getUserInfo()` still sees the JWT id.

### Phase 4 — Collect/verify page (client redirect) — **done (prod)**

No API deny for unverified users.

Logged in, IdM or `fake_xxx`, and any of: `email` empty; `isVerified` false; real IdM email not `@fau.de` → `/collect-email`.

Password users are not redirected.

**Exempt routes:** collect page, `/verify`, `/login`, signup/password-reset/logout/auth-callback, `/profile`, `/my-profile`.

**Collect page:** show current email; real IdM requires `@fau.de` (button disabled until valid); `fake_xxx` any address; save via helper (`userId` unchanged); send `/verify?email=…&id=…`; match email + token.

### Phase 5 — Fake id shape (`fake_xxx`) — **done (prod)**

Login: 3-character suffix only. Auth/LMS `fake-id` is that suffix. JWT id is `fake_xxx`. Same collect page as IdM; `@fau.de` not required. No auto-verify.

### Pre-switch — Fill `userInfo.email` from mappings (not Phase 6)

**Not** the switch. Goal: put a **verified** email on IdM rows that **already exist** in `userInfo`, without changing `userId`. Production then holds both CSV-derived and user-supplied verified emails for parent Phase 6.

1. Load CSVs (`Login`/`E-Mail` + `additional_mappings.csv`).
2. `UPDATE userInfo SET email = :mapped, isVerified = 1` only when the mapping address is `@fau.de`, `idmId` or `userId` is the Login, the row is not verified (or the email already matches the mapping), and that address is not already used by another row. Empty `email` is filled. If the DB already has a **different** address: keep `@fau.de` (log both addresses, do not flip verified from mapping); overwrite non-`@fau.de` only when the mapping address is `@fau.de`. Mapping addresses that are not `@fau.de` are skipped (`mapping_not_fau_de`) and listed in the fill report. Re-run marks rows whose email already matches the mapping as verified.
3. Do **not** change `userId`. Do **not** INSERT `userInfo` for grading/ACL-only people.
4. Script: `SCRIPT_NAME=fillIdmEmailsFromMapping` (set `FILL_IDM_EMAIL_APPLY=1` to write). Dry-run first.

CSV `@fau.de` fill skips the collect page for those users (`isVerified` is set). Unmapped users still land on `/collect-email`.

**Phase 6** (rewrite `userId` from this prod mapping): [idm-to-cdi-migration.md](./idm-to-cdi-migration.md).

---

## Out of scope (explicit)

- Changing Shibboleth, eduGAIN, shibd, or LMP JWT issuance / `/getuserinfo` payload.
- Refusing authenticated APIs for unverified IdM users.
- Automatic account merge on email collision.
- Prisma for the quiz grading database.
- Renaming the comments database in infrastructure (the schema is already the user/ACL/comments store).
- Rewriting `userInfo.userId` (or other person-keyed columns) from IdM id to email **in this child**. That is parent **Phase 6**, from **prod DB**, not CSVs.
- INSERT `userInfo` for people who exist only in grading/ACL.
