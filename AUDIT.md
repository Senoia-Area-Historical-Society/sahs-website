# SAHS Website — Full Code Audit
Date: 2026-09-04 · Commit: 256da0d (main) · Scope: `sahs-website/`

## Baseline (all green)

| Check | Result |
|---|---|
| `npm run build` (root — the one CI runs) | ✅ pass, 156 sitemap URLs |
| `cd functions && npm run build` | ✅ pass |
| `npx vitest run` | ✅ 213/213 across 13 files |
| `npm run lint` | ✅ 0 errors, 58 `no-explicit-any` warnings |

## Documented-invariant re-verification (CLAUDE.md gotchas)

| Invariant | Status |
|---|---|
| Site-tested `functions/src/` modules free of Node globals/packages | ✅ all 6 clean |
| `ticketsSold` never assigned outside the webhook transaction | ✅ (one deliberate `--recount` path in `reconcile_ticket_orders.cjs`) |
| No `.toISOString()` on naive `eventStartDate`/`eventEndDate` | ✅ all uses are on absolute values |
| `undefined` never written to Firestore | ✅ ContentAdmin's `: undefined` clears are normalized by `buildPostData` |
| No reintroduced `type` filter in post queries | ⚠️ **reintroduced in 2 queries — see S2-4** |

---

# Summary

> **Status: fixed.** Everything below except S1-8 and S3-1 (which need a bucket only a
> project owner can create — see `docs/storage-bucket-separation.md`) is addressed in
> this branch, behind a new `npm run test:rules` suite wired into CI. Verification is
> at the end of this document.


Eighteen findings (one more, S1-7, was withdrawn — see its entry). **Five are live defects verified by execution**, not by reading: four break a
shipped feature for the people who actually use it, and two expose data. The unifying cause is
that every one of them is invisible to an administrator — the only identity anyone tests with.

> **Correction:** S1-7 in an earlier draft claimed the volunteer share-token query was also denied.
> It is not; that finding is retracted in full below. S1-1 alone accounts for the dead feature.

| # | Finding | Sev | Verified how |
|---|---|---|---|
| S1-1 | Public volunteer signup denied — whole transaction rolls back | S1 | emulator + prod |
| ~~S1-7~~ | ~~Share-token query denied~~ — **withdrawn, I was wrong; see below** | — | — |
| S1-6 | Editors and curators cannot upload any image | S1 | emulator |
| S1-3 | `sendNewsletter` — unauthenticated broadcast to the whole member audience | S1 | live probe |
| S1-4 | `listStripeSubscriptions` — unauthenticated full member roster (name, email, level) | S1 | live probe |
| S1-5 | Draft posts publicly readable and queryable by slug (0 drafts in prod today) | S1 | emulator + prod |
| S1-2 | `mail` was an open relay — extension **confirmed installed** | S1 | emulator + prod |
| S1-8 | **Both repos deploy storage rules to one bucket and overwrite each other** | S1 | live probe |
| S1-9 | **Every Trigger Email delivery has failed since April — contact form included** | S1 | prod |
| S2-1 | `/admin/users` silently does nothing for non-permanent admins | S2 | emulator |
| S2-5 | Editors get an infinite spinner on the volunteer roster | S2 | emulator |
| S2-2 | `verifyTicket` returns buyer name+email to anonymous callers | S2 | live probe |
| S2-3 | `renderEmailPreview` — public arbitrary-HTML renderer | S2 | live probe |
| S2-4 | `type == 'event'` filters reintroduced in two queries | S2 | grep + writer audit |
| S2-6 | Unbounded anonymous writes to `submissions` / `registrations` | S2 | emulator |
| S2-7 | Nav advertises three pages most staff cannot use | S2 | emulator + read |
| S3-1 | Entire shared Storage bucket world-readable (incl. archive-app) | S3 | read |
| S3-2 | Ticket confirmation numbers from `Math.random()` | S3 | read + measured |
| S3-3 | `stripeWebhook` falls back to a hardcoded signature secret | S3 | read |
| S3-4 | **Rules have no test coverage** — the root cause of six of the above | S3 | — |
| S4-1 | CLAUDE.md lists two Cloud Functions that no longer exist | S4 | read |

**Suggested order of work:** S1-2's open question first (one command, and it decides whether
volunteer confirmation emails have ever worked) → the two unauthenticated Cloud Functions
(S1-3, S1-4) since those are exposed right now and the fix is one shared helper → the volunteer
module (S1-1, dead in production) → S1-6 → then S3-4, which is what
stops the next six.

## What is in good shape

Worth saying plainly, because the list above is one-sided:

- **The money path is the best-engineered part of the system.** Webhook signature verification runs
  before any write; fulfilment is idempotent on the Checkout Session id; the ticket write and the
  `ticketsSold` increment share one transaction with all reads ordered first; failures return 5xx so
  Stripe retries; unrecognized events return 200. Prices are derived server-side from Firestore.
  Every one of those properties is pinned by a test.
- **Every documented CLAUDE.md invariant still holds** — the build-isolation rule for site-tested
  `functions/src/` modules, `ticketsSold` ownership, no `.toISOString()` on naive datetime strings,
  no `undefined` reaching Firestore. Those gotchas are doing their job.
- **Baseline is green**: root build, functions build, 213/213 tests, 0 lint errors.
- The `getTicketBySession` design — replacing a public `tickets` read rule with a Cloud Function
  keyed on the high-entropy Stripe session id — is exactly right, and its comment block explains
  the reasoning well enough that the next person will not undo it.

The pattern worth taking from this audit: **the tested surfaces are clean and the untested surface
is where every defect is.** Pure logic got extracted and covered; authorization never did.

---

# Production verification (read-only)

The rules findings below were produced against `firestore.rules` as it sits at HEAD. That proves the
*file* denies these operations, not that production does — so I checked production directly with the
service-account key (`GOOGLE_APPLICATION_CREDENTIALS`, Admin SDK, **reads only, no writes**). The
Firebase MCP tools and `firebase ext:list` both 403 with the credentials available here, so the
deployed rules could not be fetched for a byte-for-byte comparison; the data below is the indirect
evidence, and it is conclusive.

## The volunteer module has never received a public signup

| Sheet | Created | Status | Registrations | filledCount |
|---|---|---|---|---|
| "Volunteer Sign Up" | 2026-04-24 | active | 1 | 1 |
| "Family Day Volunteers" | 2026-06-30 | active | 1 | 0 |

Both registrations carry an `@j3rm.io` email — the developer's own domain. Neither is a member of
the public. Their timestamps explain the rest:

- The April row was created 2026-04-24T00:11:09Z with the slot's `filledCount` incremented in the
  same instant (identical `updateTime`) — the transaction completed, because whoever submitted it
  was signed in and passed `isEditor()`.
- The July row was created 2026-07-01T18:18:52Z, then set `status: 'cancelled'` at 18:44:14Z with
  the slot decremented back to 0 at that same timestamp. That is `cancelRegistration` working
  correctly, not a partial write — so it is not counter-evidence for the atomicity claim in S1-1.

So in the **four and a half months** since the feature shipped (`a56cbee`, 2026-04-23), across two
sheets that have been `active` the entire time, the only two signups on record are the author's own
test submissions, both made while authenticated. That is exactly the signature S1-1
predicts: it works for whoever tests it and for nobody else.

The rules history rules out the obvious alternative explanation. `git log -S` shows the whole
`volunteer_sheets` block is **byte-identical** to its 2026-04-25 form (`53ed805`), and the rule and
the client code that contradicts it landed in the *same commit* — so the mismatch has existed since
day one and was never briefly permissive.

**This also half-resolves S1-2.** Since no public signup ever completed, no volunteer confirmation
email was ever *attempted*, so the Trigger Email extension's status does not affect S1-1's blast
radius. It stays open for the relay risk itself — and the `mail` collection holds **16 documents**,
so something has been writing to that queue.

## Two corrections to the findings below, from this data

**S1-5 — the draft exposure is real but currently exposes nothing.** Production has **0 posts with
`status: 'draft'`**. The rule genuinely permits anonymous reads of drafts and the slug-query result
is reproducible, so the finding stands as written — but where it says "there are unpublished drafts
in the repo right now (PR #69)", that refers to seed scripts, not to production state. Nothing is
leaking today. Fix it before the next embargoed announcement, not tonight.

**S2-4 — confirmed latent, not live.** **0 posts in production are missing the `type` field**, so
neither `BoxOffice` nor the dashboard tile is dropping anything today. The filter is a tripwire for
the future, exactly as described, and its priority should be read accordingly.

---

# Findings

Severity: **S1** = live break or data/PII exposure · **S2** = real defect, bounded blast radius · **S3** = hardening / correctness debt · **S4** = doc drift.

All rules findings below were verified empirically by running `firestore.rules` against the
Firestore emulator with `@firebase/rules-unit-testing` (unauthenticated + both admin shapes),
not by reading. Reproduction harness: `AUDIT-rules-harness.mjs`.

---

## S1-1 — Public volunteer signup is completely broken (permission denied on every submit)

`src/services/api.ts:404` — `submitVolunteerSignup` ends its transaction with:

```ts
tx.update(slotRef, { filledCount: slot.filledCount + 1 });
```

`firestore.rules:95` allows writes to `volunteer_sheets/{id}/slots/{slotId}` only `if isEditor()`.
An anonymous volunteer is not an editor, so the write is denied — and because the registration
`tx.set` is in the *same* transaction, **the whole signup is rolled back**. No registration row,
no confirmation email, no count.

Emulator result, verbatim:

```
anon: volunteer signup transaction (reg + filledCount)  expect ALLOWED  ->  DENIED
PERMISSION_DENIED: false for 'update' @ L95, false for 'update' @ L129
```

The volunteer sees the generic `err.message` from `VolunteerSignup.tsx:60`. Note the failure is
invisible to staff testing: an editor signed into the admin portal passes `isEditor()`, so the
form works for whoever tests it and fails for every actual member of the public.

This is why the CLAUDE.md line "Volunteer slot capacity is maintained via transaction … incremented
atomically via Firestore transaction on public signup" cannot currently be true.

**Fix direction.** The counter is exactly the kind of derived value the client should not be
trusted with anyway (a public caller who *could* write the slot could also write `filledCount: 0`
and oversell the shift). Two options, in order of preference:

1. Move the increment into an `onDocumentCreated('volunteer_sheets/{s}/registrations/{r}')` trigger
   and drop the slot write from the client transaction. Capacity is then enforced server-side, the
   public rule stays `create: if true`, and it matches how `ticketsSold` is already handled.
2. Narrow the slots rule to permit exactly the increment, e.g. allow an unauthenticated update whose
   only changed key is `filledCount`, whose new value is `resource.data.filledCount + 1`, and which
   stays `<= resource.data.capacity`. Cheaper, but it puts the capacity check in rules where it is
   easy to get subtly wrong.

## S1-2 — `mail` accepts unauthenticated writes (open relay if the Trigger Email extension is live)

`firestore.rules:110` — `match /mail/{doc} { allow create: if true; }`. Confirmed on the emulator:
an unauthenticated caller can create arbitrary documents in `mail/`.

**Caveat — I could not verify the extension is installed.** `npx firebase ext:list --project
sahs-archives` returns HTTP 403 (the credentials available here lack
`firebaseextensions` read permission), and there is no `extensions/` directory or extension block
in `firebase.json`. So the severity is conditional:

- *If* the Firebase Trigger Email extension is installed — and `submitVolunteerSignup` writing to
  `mail/` at `api.ts:419` strongly implies someone intended it to be — then anyone who knows the
  project id can have arbitrary `to`/`from`/`subject`/`html` delivered over SAHS's own
  authenticated sending domain. SPF/DKIM-aligned phishing from the historical society, at any
  volume. That is S1.
- *If* it is not installed, this rule is a latent hole rather than a live one — **but then volunteer
  confirmation emails have never been sent at all**, which is its own defect worth checking.

**Please resolve which it is first** — it decides both the urgency here and whether S1-1's
confirmation email ever worked. One command with adequate credentials settles it:

```bash
npx firebase ext:list --project sahs-archives
```

Either way the rule should not stay `create: if true`. Once the volunteer confirmation moves
server-side (see S1-1), nothing in the client needs to write `mail/` and it can become
`allow create: if false` — the extension writes as admin and bypasses rules entirely.

## S1-3 — `sendNewsletter` is a public, unauthenticated broadcast endpoint

`functions/src/index.ts:1029` — `onRequest({ secrets: [...], cors: true, invoker: 'public' })` with
**no token check anywhere in the handler**. `grep -c verifyIdToken functions/src/index.ts` → 0.

Two capabilities are handed to any caller who knows the URL:

- `{ testEmail, newsletterProps }` → sends arbitrary attacker-authored HTML to any address they name,
  `from: Senoia Area Historical Society <membership@updates.senoiahistory.com>`.
- `{ newsletterProps }` with no `testEmail` → creates a **Resend broadcast to the entire member
  audience**. One unauthenticated POST reaches every member on file.

The function URL is not a secret: it is called from `NewsletterComposer.tsx`, so it is in the
production JS bundle that every visitor downloads.

**Fix direction.** Require a Firebase ID token and re-check the role server-side —
`getAuth().verifyIdToken(req.headers.authorization?.split('Bearer ')[1])`, then read
`user_roles/{email}` with the Admin SDK and require `admin`/`curator`. Client side, attach
`await user.getIdToken()`. The same treatment applies to S1-4 and S2-4.

## S1-4 — `listStripeSubscriptions` publishes the whole member roster unauthenticated

`functions/src/index.ts:247` — same shape: `cors: true`, no auth. A plain `GET` returns every
subscription Stripe has ever held for the account, formatted, as JSON: **name, email, membership
level, status, expiration date and Stripe subscription id** for the entire membership, current and
lapsed (`status: 'all'` is deliberate, and auto-paged to `MAX_STRIPE_PAGE_ITEMS`, so it is the
complete list rather than a page).

This is the same class of defect PR #58 fixed by retiring `/membership-status` ("an unauthenticated
membership oracle") — but bulk rather than one-at-a-time, and it is still live.

## S1-5 — Draft posts are publicly readable

`firestore.rules:49` — `match /posts/{doc} { allow read: if true; }` with no `status` predicate.
Confirmed: an unauthenticated caller can both `get` a specific draft and `list` the whole
collection including drafts.

The client queries all filter `where('status','==','published')`, and PR #a94fc5e ("stop serving
unpublished posts") fixed the *client*; the rule was never narrowed. Rules are the actual boundary —
embargoed announcements, unannounced event dates and pricing are readable by anyone via the REST
API. There are unpublished drafts in the repo right now (PR #69, McIntosh roundtable and Photos
with Santa).

Confirmed concretely: an anonymous `where('slug','==','secret-santa')` query — the exact shape
`NewsDetail.tsx:33` issues — returns the draft.

This was a deliberate choice, not an oversight. The comment at `NewsDetail.tsx:38` says so: "Firestore
allows public read of every post, so this is the only gate." But a client-side `if` is not a
security boundary — it governs rendering, not the REST API underneath it.

**Fix direction, with a trap.** The obvious narrowing —
`allow read: if resource.data.status == 'published' || isSAHSStaff();` — **will break every event
detail page** if applied alone. Firestore's "rules are not filters" behaviour means a `list` query
is rejected outright unless the query itself carries a constraint that satisfies the rule, and
`NewsDetail` queries on `slug` alone. So the rule change must land together with a client change:
issue `where('slug',..), where('status','==','published')` for anonymous visitors and the
unfiltered query only when `isSAHSUser` (preserving the staff draft-preview the comment describes).
`getEventsSplit` (`api.ts:46`) already filters on status and is unaffected; `shortlinkRedirect`
queries posts by slug without a status filter but runs in a Cloud Function via the Admin SDK, which
bypasses rules entirely.

## S2-1 — `/admin/users` is broken for every admin who is not Cat or Jeremy

`firestore.rules:115-125` restricts `user_roles` **read to self** and **write to the two hardcoded
addresses only** — it never calls `isAdmin()` (deliberately, to avoid rule recursion).

But `UsersAdmin.tsx:16,42,47` gates the page on `isAdmin` from `AuthContext`, which *does* include
`role: 'admin'` overrides. So an override-admin:

- passes `ProtectedRoute` and the `if (!isAdmin)` check, and sees the full management UI;
- gets `PERMISSION_DENIED` on the `user_roles` list at line 26, so the grid is empty;
- gets `PERMISSION_DENIED` on every `setDoc`/`deleteDoc` at lines 61 and 80.

Confirmed on the emulator: an `override-admin@senoiahistory.com` carrying `role: 'admin'` is DENIED
on both list and write, while `jeremywarren@` is ALLOWED on both.

The result is a page that looks functional and silently does nothing — for exactly the people
CLAUDE.md says should be using it ("Roles are managed at `/admin/users`, admin-only"). Either the
rule should consult the role document (one extra `get`, recursion-safe because the lookup is on the
*caller's own* doc, not the target's), or the UI should gate on the permanent-admin list so the
limitation is honest.

## S1-6 — Editors and curators cannot upload any image

`storage.rules:7-13` defines its own `isSAHSUser()` that compares against **two hardcoded
addresses and nothing else**. It never reads `user_roles`. So the Storage and Firestore rules have
silently drifted into two different auth models under the same helper name.

Verified on the Storage emulator against the real `storage.rules`:

| Caller | Upload |
|---|---|
| `jeremywarren@senoiahistory.com` (permanent admin) | ALLOWED |
| a `curator` role holder | **DENIED** |
| an `editor` role holder | **DENIED** |
| anonymous | DENIED (correct) |

Three admin surfaces call `uploadFile` — `ContentAdmin.tsx:9` (post artwork), `PlacesAdmin.tsx:6`
(place photos) and `RichTextEditor.tsx:15` (inline article images). For everyone except Cat and
Jeremy, all three fail. Firestore *does* honour the role, so an editor can write the post and only
discovers the problem when the image will not attach — the failure lands mid-workflow rather than
at the door.

This directly contradicts CLAUDE.md: "Firestore and Storage rules mirror this via `isSAHSUser()`,
`isEditor()`, `isCurator()`, `isAdmin()` helpers." Storage has none of those.

Fix: port the four role helpers from `firestore.rules` into `storage.rules`. Note that Storage
rules can read Firestore with `firestore.get(/databases/(default)/documents/user_roles/$(...))`,
which is what makes a real mirror possible.

## S3-1 — The whole shared Storage bucket is world-readable

`storage.rules:17-18` — `match /{allPaths=**} { allow read: if true; }`. Per CLAUDE.md this bucket
is **shared with archive-app**, so this grants anonymous read to archive scans and media as well as
website images. archive-app's right-click blocking is cosmetic against a plain bucket URL.

Flagging rather than asserting a defect: a public historical archive may well intend public read.
But it should be an explicit decision recorded somewhere, and it is a cross-app blast radius set by
*this* repo's rules file. If any archive material is rights-restricted or donor-embargoed, this is
the rule that is not enforcing it.

## S2-2 — `verifyTicket` returns buyer PII to anonymous callers

`functions/src/index.ts:736`, `cors: true`, no auth. Confirmed reachable anonymously in production
(an anonymous request reaches the handler's own validation and returns 400, not a 403 from IAM).

Given a confirmation number it returns `customerName`, `email`, `eventTitle`, `quantity` and
`purchasedAt`. Confirmation numbers are 8 base-36 characters (~41 bits), so this is not practically
enumerable — but the endpoint exists only to serve `/admin/tickets/scan`, which is already behind
`ProtectedRoute`, so there is no reason for it to be open. The `getTicketBySession` comment block
at line 795 explicitly reasons about this ("`verifyTicket` validates at the door on confirmation
number alone") without closing it.

## S3-2 — Confirmation numbers come from `Math.random()`

`functions/src/index.ts:170` — `Math.random().toString(36).substring(2, 10).toUpperCase()`.

`Math.random()` is not cryptographically secure (V8 xorshift128+ state is recoverable from
observed outputs), and this value is the sole credential `verifyTicket` admits people on. There is
also no uniqueness check against existing tickets. Measured over 3M draws, 0.0007% of outputs are
7 characters rather than 8 — negligible, not the issue.

Use `crypto.randomBytes(8).toString('base32'/'hex')` or equivalent. Low practical risk today;
cheap to fix, and it is the kind of thing that only matters once someone is motivated.

## S2-3 — `renderEmailPreview` is a public arbitrary-HTML renderer

`functions/src/index.ts:992`, `invoker: 'public'`, no auth, confirmed reachable. It renders
caller-supplied `props` through the React Email templates and returns them as `text/html` from a
Google-owned origin. Not a session-stealing XSS (distinct origin, no cookies), but it is a free
attacker-controlled HTML page hosted under `cloudfunctions.net` and an unmetered render workload.
Same fix as S1-3: require an ID token.

## S2-4 — `type == 'event'` filters reintroduced in two queries

CLAUDE.md: "Do not reintroduce a `type` filter in a query — that is what made a 2023 article appear
in Home's sidebar but not in `/past-sahs-events`." Two queries now carry one:

- `src/pages/BoxOffice.tsx:23` — `where('type', '==', 'event')`
- `src/pages/admin/AdminDashboard.tsx:34` — same, for the "upcoming events" tile

Firestore `where` is exclusionary on a missing field: a post without `type` is not "not equal", it
is absent from the index entirely and vanishes from the list. Today every writer sets it —
`buildPostData` writes `type: 'event'` unconditionally, and all five `seed_*.cjs` scripts do too —
so this is currently latent rather than live. It becomes live the moment a post is created any
other way (Firestore console, a migration, an import). The filter buys nothing: both call sites
already filter client-side (`ticketPrice > 0`; upcoming-by-date). Drop it.

## S4-1 — CLAUDE.md documents a function that no longer exists

The Cloud Functions table lists `getMembershipByEmail` ("Self-service Stripe lookup by email").
No such export exists — PR #58 retired it along with `/membership-status`. `createMembershipCheckoutSession`
is likewise still listed but was deleted as dead code (see the comment at `functions/src/index.ts:174`).
The table should list the nine functions that actually deploy.

## ~~S1-7 — Public volunteer sheets cannot even be loaded~~ — WITHDRAWN, I was wrong

**This finding was incorrect and is retracted.** `getVolunteerSheetByToken`
(`src/services/api.ts:283`) already carries `where('status','==','active')` alongside the
`shareToken` filter, so the query satisfies the rule and public sheets load fine.

How I got it wrong is worth recording, because the mistake is a tempting one. I read the function
through a `grep -n` that printed only the lines matching `collection(`/`where(`/`getDocs`, saw the
line numbers jump 286 → 294, and concluded the query was `shareToken` + `limit` alone. I never read
lines 287–288. I then "verified" it on the emulator against a query **I had written myself** from
that assumption — so the test confirmed my inference rather than the code, and confirmed it
convincingly enough that I put it in the summary as a headline break.

The emulator result in that table is still true as a statement about Firestore ("rules are not
filters", a token-only query would indeed be denied). It was simply not a statement about this
codebase.

What survives: the reasoning applies unchanged to **S1-5**, where `NewsDetail.tsx:33` really does
query on `slug` alone, and that is what makes the rule narrowing there require a paired client
change. The single real volunteer break is **S1-1** — which is on its own entirely sufficient to
explain zero public signups, since the sheet loads, the form renders, and only the submit fails.

## S2-5 — Editors get an infinite spinner on the volunteer roster

`firestore.rules:101` — `volunteer_sheets/{id}/registrations` is `read: if isCurator()`. But
`/admin/volunteers` is behind `ProtectedRoute`, which gates on `isSAHSUser`. Confirmed: an `editor`
is DENIED the registrations read; a `curator` is allowed.

`VolunteersAdmin.tsx:97` calls it inside a bare `Promise.all` with **no `catch`**, and unlike
`getVolunteerSlots` (which swallows errors and returns `[]` at `api.ts:346`), `getRegistrations`
rethrows. So the rejection escapes, `setRosterLoading(false)` at line 103 never runs, and the roster
view spins forever rather than reporting a permission problem.

Two things to decide: whether editors *should* see signups (they manage the sheets, so probably
yes — align the rule to `isEditor()`), and independently, `openRoster` needs a `try/finally` so any
future failure surfaces instead of hanging.

## S2-6 — Unbounded, unvalidated anonymous writes to `submissions` and `registrations`

Both are `allow create: if true` with no shape, size or field constraint. Confirmed: an
unauthenticated caller can create a ~900 KB document in either collection, carrying any fields it
likes — including forged ones such as `status: 'approved'` on a submission or `status: 'confirmed'`
on a registration, which is what the admin views read to decide what is real.

Two consequences: a scripted loop is an unmetered write-and-storage bill against the project, and
the integrity of both admin queues rests on nobody having tried. Add rule-level constraints —
`request.resource.data.keys().hasOnly([...])`, `.size() < N` on free-text fields, and pin
server-controlled fields (`status`, `signedUpAt`) to literal expected values.

## S2-7 — Staff-wide nav advertises three pages that most staff cannot use

`AdminHeader.tsx:41-69` builds the Content/Operations/Commerce groups unconditionally; only the
System group (User Roles) is wrapped in `if (isAdmin)` at line 71. So every signed-in staff account,
including `read_only` and `board_member`, is shown links to:

| Nav item | Rule | Who actually succeeds |
|---|---|---|
| Wiki | `isEditor()` read+write | editor and above — `read_only`/`board_member` DENIED (confirmed) |
| Short Links | `isAdmin()` | admins only — confirmed DENIED for curator |
| Newsletter | *no rule — public Cloud Function* | **anyone**, see S1-3 |

The Wiki and Short Links rules match CLAUDE.md's intent; the defect is that the nav does not, so
lower-privilege staff are routed into dead ends. Filter `navGroups` by role the way the System
group already is.

## S3-3 — `stripeWebhook` falls back to a hardcoded signature secret

`functions/src/index.ts:672`:

```ts
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
```

Signature verification itself is correct and complete — `constructEvent` runs against `rawBody`
before any Firestore write, and an unverifiable payload gets a 400 with no retry (line 677). That
part is right.

The `|| 'whsec_mock'` default is the problem: it fails *open* into a publicly-known constant
rather than refusing to start. CLAUDE.md's own gotcha is that a secret can be `undefined` on Cloud
Run despite existing in Secret Manager. It is correctly declared in the `secrets` array today, so
this is latent — but the failure mode it creates is forged webhooks minting free tickets and
memberships, which is the highest-value thing in the system. Prefer returning 500 when the secret
is absent, and confine the mock to an explicit emulator check.

## S3-4 — Rules have no test coverage

Everything above was found by pointing `@firebase/rules-unit-testing` at `firestore.rules` and
`storage.rules` for an afternoon. There is thorough coverage of pure logic (213 tests over
`postEditorMapping`, `ticketPricing`, `checkoutFulfillment`, `calendarTime`, …) and **zero** over
the rules — which is where six of the defects in this report live, including both hard breaks.

The gap is structural: the well-tested modules are pure functions extracted specifically to be
testable, while the rules are only exercised by manually clicking the admin UI *as an admin* —
the one identity that passes every check. That is precisely why S1-1 and S1-6 shipped.

The highest-leverage remediation in this report is not any single fix: it is adding
`firebase emulators:exec --only firestore,storage` to CI with a case per role
(anon / read_only / editor / curator / override-admin / permanent-admin) for each collection.
The harness in `AUDIT-rules-harness.mjs` (run it with `npx firebase emulators:exec --only firestore --project demo-test "node AUDIT-rules-harness.mjs"` after `npm i --no-save @firebase/rules-unit-testing`) is a working starting point.

---

## S1-8 — Both repos deploy Storage rules to one bucket, and overwrite each other

Found while fixing S1-6, and more serious than it. `sahs-website` and `archive-app` both
deploy Storage rules to `sahs-archives.firebasestorage.app`:

| Repo | Deploy step |
|---|---|
| `sahs-website` | `deploy --only firestore:rules,storage` |
| `archive-app` | `deploy --only hosting,functions,storage,firestore` |

Storage rules are per-bucket and wholly replaced on deploy, so whichever repo merged most
recently owns the policy and silently discards the other's. The two are incompatible: the
website grants `allow read: if true` bucket-wide, while archive-app grants no anonymous
read at all — its PR #19 moved public visibility to per-object ACLs precisely because a
private item's original had been returning HTTP 200 and 493 KB to an anonymous request.

**The website's ruleset is live** (deployed 09-02, after archive-app's 08-30), so
archive-app's fix is currently reverted. Verified without touching archive material: a GET
for a path that does not exist under `archive_media/` returns **404, not 403**, and rules
are evaluated before existence, so anonymous read is permitted bucket-wide right now.

```
audit-probe-nonexistent-object-123.png         -> HTTP 404
archive_media/audit-probe-nonexistent-456.jpg  -> HTTP 404
```

Not fixed here, deliberately. The read clause is left byte-identical because archive-app
serves its public items from this same bucket and tightening it from this repo could break
the public archive with no way to test that from here. Only the *write* clause changed
(S1-6). The real fix is a separate bucket — `docs/storage-bucket-separation.md` — which
needs a bucket creation and a GitHub Actions secret change that only a project owner can do.

## S1-9 — Every Trigger Email delivery has failed since April, contact form included

The Firebase Trigger Email extension **is** installed (the audit could not confirm this;
`ext:list` 403s, but every `mail` document carries the `delivery` field the extension
writes). All sixteen documents queued between 2026-04-24 and 2026-08-28 are in state
`ERROR`, all with the same cause and all with `attempts: 1`:

```
Error: Message failed: 550 The senoiahistory.com domain is not verified.
Please, add and verify your domain on https://resend.com/domains
```

The extension sends as the apex `senoiahistory.com`. Only `updates.senoiahistory.com` is
verified in Resend — which is why the ticket, membership and newsletter paths work and
this one never has. **Real contact-form enquiries on 2026-05-15 and 2026-08-17 were never
delivered and nobody knew**, because the extension records the failure on the document and
stops.

Fixed here by removing the extension from the path entirely: the contact form files a
`submissions` document and `onSubmissionCreated` emails info@ through Resend on the
verified subdomain; `onVolunteerRegistration` does the same for volunteer confirmations.
Storing the message as data first also means a future delivery failure no longer loses
the enquiry. `mail` is now `allow read, write: if false`, which closes S1-2's relay as a
side effect rather than at the cost of breaking these sends.

**Still needs you:** the sixteen failed messages are still sitting in `mail/`. Two of them
are real enquiries from members of the public who never got a reply. Worth reading and
answering before deleting the collection.

---

# Verification of the fixes

```
npm run build                     ✅  (root — the build CI gates on)
cd functions && npm run build     ✅
npx vitest run                    ✅  241 passed (was 213; +28 new)
npm run test:rules                ✅  33 passed, 3 skipped (new suite)
npm run lint                      ✅  0 errors, 58 pre-existing warnings
```

The rules suite was written **against the fixed behaviour first and watched fail** — ten
failures against the old rules, each mapping to a finding above. That ordering is the only
reason to trust it; a rules test written after the fix only proves the rules do what they do.

End-to-end against the emulators, as an anonymous visitor:

| Flow | Before | After |
|---|---|---|
| Volunteer signup | PERMISSION_DENIED, whole transaction rolled back | **"You're signed up!"**, slot 0/3 → 1/3, registration `status: confirmed`, 0 writes to `mail` |
| Draft post by slug | readable | "Post Not Found" |
| Published post by slug | readable | readable, ticket widget and volunteer link intact |
| Contact form | wrote to `mail`, bounced 550, lost | files a `submissions` doc that passes the tightened rule; 0 writes to `mail` |
| Home / Box Office | — | render, no console errors |

The 3 skipped rules tests are the `firestore.get()` path in `storage.rules`, which the
Storage emulator does not implement (it evaluates cross-service calls to null). That clause
works in production but cannot be tested here, so it is `describe.skip`'d rather than
deleted, and **needs one manual check after deploy: sign in as an editor and attach an
image to a post.** The custom-claim path in the same rule *is* covered.
