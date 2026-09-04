import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import {
  buildSubmissionEmail,
  buildVolunteerConfirmationEmail,
  type SubmissionEmail,
} from './notifyEmailContent';

/**
 * Firestore-triggered notification email.
 *
 * Both of these used to be client-side writes to the `mail` collection for the
 * Firebase Trigger Email extension. That required `mail` to be public-writable —
 * an open relay over the society's own sending domain for anyone who knew the
 * project id — and the extension sends as `@senoiahistory.com`, which is not a
 * verified Resend domain, so every message bounced 550 and was never delivered.
 *
 * Moving both server-side fixes all of it at once: `mail` is closed, the sender is
 * the verified subdomain the ticket and membership paths already use, and a failed
 * send is logged against a document that still exists rather than being the only
 * copy of someone's enquiry.
 *
 * The pure content builders live in `notifyEmailContent.ts` (no imports, so the site
 * build can follow a test import into it) and are re-exported here so callers have
 * one import site. See CLAUDE.md on the root build.
 */
export * from './notifyEmailContent';

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const SECRETS = ['RESEND_API_KEY'];

async function send(mail: SubmissionEmail, context: string): Promise<void> {
  if (!mail.to) {
    console.warn(`${context}: no recipient address, nothing sent`);
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    // Loud rather than silent: a missing secret is the failure mode that let sixteen
    // messages disappear, and there is nothing to retry against if we swallow it.
    console.error(`${context}: RESEND_API_KEY is not configured, email NOT sent`);
    return;
  }
  const { error } = await getResend().emails.send({
    from: mail.from,
    to: mail.to,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    subject: mail.subject,
    html: mail.html,
  });
  if (error) {
    console.error(`${context}: Resend rejected the message`, error);
    return;
  }
  console.log(`${context}: sent to ${mail.to}`);
}

/**
 * Notifies info@ when someone files a contact message or a vendor/sponsor application.
 *
 * Deliberately does NOT throw on a send failure. The submission is already stored, and
 * a throw here only produces trigger retries that re-send on success — the document is
 * the durable record, and the log line is the alert.
 */
export const onSubmissionCreated = onDocumentCreated(
  { document: 'submissions/{submissionId}', secrets: SECRETS },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    await send(buildSubmissionEmail(data), `onSubmissionCreated(${event.params.submissionId})`);
  }
);

/**
 * Sends a volunteer their confirmation once the registration document exists.
 *
 * The sheet and slot are read here rather than passed through the registration,
 * because the client only writes the fields `firestore.rules` allows it to.
 */
export const onVolunteerRegistration = onDocumentCreated(
  { document: 'volunteer_sheets/{sheetId}/registrations/{registrationId}', secrets: SECRETS },
  async (event) => {
    const reg = event.data?.data();
    if (!reg) return;
    const { sheetId, registrationId } = event.params;
    const context = `onVolunteerRegistration(${sheetId}/${registrationId})`;

    // A registration created as already-cancelled has nothing to confirm.
    if (reg.status && reg.status !== 'confirmed') return;

    const db = getFirestore();
    const [sheetSnap, slotSnap] = await Promise.all([
      db.doc(`volunteer_sheets/${sheetId}`).get(),
      reg.slotId
        ? db.doc(`volunteer_sheets/${sheetId}/slots/${reg.slotId}`).get()
        : Promise.resolve(null),
    ]);
    const sheet = sheetSnap.data() ?? {};
    const slot = slotSnap?.data() ?? {};

    // `eventDate` is a Firestore Timestamp — absolute, so formatting it is safe.
    // (Contrast the naive `datetime-local` strings in calendarTime.ts.)
    const eventDate = sheet.eventDate?.toDate
      ? sheet.eventDate.toDate().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          timeZone: 'America/New_York',
        })
      : null;

    await send(
      buildVolunteerConfirmationEmail({
        firstName: reg.firstName,
        email: reg.email,
        slotLabel: reg.slotLabel,
        slotTimeNote: reg.slotTimeNote,
        shiftDuration: slot.shiftDuration,
        sheetTitle: sheet.title,
        eventDate,
        eventLocation: sheet.eventLocation,
      }),
      context
    );
  }
);
