---
name: sahs-website-box-office
description: >
  Look up ticket sales for a SAHS event — how many sold, how many orders, whether
  the denormalized counter agrees with the raw ticket records. Use when asked how
  many tickets an event has sold, for a box-office/sales count, or to reconcile
  ticketsSold against actual ticket documents. Read-only; never writes.
---

# SAHS Website — Box Office Lookups

"How many tickets have we sold to `<event>`" is a two-source-of-truth read against
production Firestore's default database. `scripts/box_office_report.cjs` does this —
use it instead of writing a one-off query.

## Data model

- An event is a `posts` document (see the "no news/event split" gotcha in
  `CLAUDE.md` — every post is potentially an event; `eventDate` and `ticketPrice`
  are what make it ticketed).
- `posts.ticketsSold` is a **denormalized counter**. `stripeWebhook` increments it
  inside the same Firestore transaction that writes the ticket document, so it
  should always agree with reality — see "stripeWebhook must answer 5xx..." in
  `CLAUDE.md`. **Never write this field from a script** — only the webhook's
  transaction may.
- Each purchase is a `tickets/{stripeSessionId}` document: `eventId` (→ the post
  id), `quantity`, `status` (`'paid' | 'cancelled'`), `email`, `confirmationNumber`.
  Older, pre-fix tickets used `.add()` with an auto id and only carry
  `stripeSessionId` as a field — irrelevant for counting (a `where('eventId', '==',
  ...)` query catches both shapes), but relevant if you ever need to look one up by
  session id directly (see `scripts/reconcile_ticket_orders.cjs`).
- **A sale is `quantity` summed over `status == 'paid'` tickets for that
  `eventId`.** Cancelled tickets exist as records but are not sales — exclude them.

## Run it

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
node scripts/box_office_report.cjs --title "yacht rock"

# Every ticketed event at once:
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json \
node scripts/box_office_report.cjs --all
```

It prints, per matching post: the denormalized `ticketsSold` counter, a live sum
over the `tickets` collection (paid quantity + order count, cancelled called out
separately), and a match/mismatch verdict between the two. Targets production
unless `FIRESTORE_EMULATOR_HOST` is set — the target is always printed first.

No `STRIPE_SECRET_KEY` needed; this only reads Firestore, not Stripe.

## Gotcha: event titles repeat

Annual events (Yacht Rock Party, poker run, etc.) get a **new post per year** with
the same or similar title and a year-suffixed slug (`yacht-rock-party-2026`). A
title match will return more than one document — `box_office_report.cjs`
deliberately prints every match sorted by `eventDate` rather than guessing which
one you meant. Disambiguate by `eventDate`/`slug` in the output, not by assuming
the first or last result is "the" event. A past year's post can still exist with
`ticketsSold: 0` (never ticketed, or a stale duplicate) — don't mistake it for the
upcoming one.

## If you need it ad hoc instead

The script is a thin wrapper — if it doesn't cover what you need (e.g. a specific
`stripeSessionId` lookup, or filtering by purchase date), query directly the same
way `scripts/reconcile_ticket_orders.cjs` and `scripts/backfill_missed_ticket.cjs`
do: load `firebase-admin` from `functions/node_modules` via `createRequire`
(the site package doesn't depend on it), `initializeApp({ projectId: 'sahs-archives'
})`, then `getFirestore()`. That pattern is documented in both scripts' headers.

## See Also

- `CLAUDE.md` — `stripeWebhook` gotcha (why `ticketsSold` is trustworthy), "no
  news/event split" gotcha, "never write ticketsSold from a script"
- `scripts/reconcile_ticket_orders.cjs` — finds tickets Stripe was paid for but
  Firestore never recorded
- `scripts/backfill_missed_ticket.cjs` — manually recreates one missing ticket
- `/author-sahs-event` — creating a new ticketed event
