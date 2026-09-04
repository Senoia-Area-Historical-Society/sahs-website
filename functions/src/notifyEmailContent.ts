/**
 * Content builders for the two notification emails triggered by Firestore writes:
 * a contact/application submission, and a volunteer signup confirmation.
 *
 * This module has NO imports on purpose. `src/test/notifyEmailContent.test.ts`
 * imports it, and the site's `tsc -b` follows that import into this file — but the
 * site tsconfig has no `node` types and none of the functions dependencies, so a
 * single `process.env` or `resend` reference here would fail the ROOT build (TS2591)
 * while `cd functions && npm run build` passed happily. CI only runs the root build,
 * so that ships as a failed deploy on main. The Resend half lives in `notifyEmail.ts`,
 * which re-exports these so callers keep one import site.
 *
 * See "A green functions build does not mean CI passes" in CLAUDE.md.
 */

/**
 * The only verified sending domain on the Resend account.
 *
 * The apex `senoiahistory.com` is NOT verified. Every message the Trigger Email
 * extension queued between April and August 2026 — sixteen of them, including two
 * real enquiries from the public contact form — failed with
 * `550 The senoiahistory.com domain is not verified`, and nobody saw them because
 * the extension records the error on the document and stops. Send from this
 * subdomain, as the ticket and membership paths already do.
 */
export const VERIFIED_SENDER_DOMAIN = 'updates.senoiahistory.com';

export const SUBMISSION_RECIPIENT = 'info@senoiahistory.com';

export interface SubmissionEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
}

/**
 * Escapes text for interpolation into an HTML email body.
 *
 * Every value here is attacker-supplied — these are public, unauthenticated forms —
 * and the previous client-side template interpolated `name` and `message` raw. The
 * recipient is staff rather than the public, so this was never a route to stealing a
 * session, but a submission could still forge convincing markup inside a mail that
 * appears to come from the society.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const shell = (title: string, rows: string) => `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2c2c2c;">
  <h2 style="color: #8B6914;">Senoia Area Historical Society</h2>
  <h3 style="margin-bottom: 16px;">${escapeHtml(title)}</h3>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">${rows}</table>
</div>`.trim();

const row = (label: string, value: unknown) =>
  value === null || value === undefined || value === ''
    ? ''
    : `<tr>` +
      `<td style="padding: 8px; border: 1px solid #e0d8c0; font-weight: bold; vertical-align: top;">${escapeHtml(label)}</td>` +
      `<td style="padding: 8px; border: 1px solid #e0d8c0;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>` +
      `</tr>`;

const TYPE_LABEL: Record<string, string> = {
  contact: 'Contact form message',
  vendor: 'Vendor application',
  sponsor: 'Sponsor application',
};

/**
 * Staff notification for a new `submissions` document.
 *
 * `replyTo` is the submitter so a reply goes back to them, while `from` stays on the
 * verified domain — setting `from` to the submitter's address is what would get the
 * message rejected or spam-filed.
 */
export function buildSubmissionEmail(data: Record<string, unknown>): SubmissionEmail {
  const type = String(data.type ?? 'contact');
  const label = TYPE_LABEL[type] ?? 'Website submission';
  const who = String(data.name ?? data.contactName ?? data.businessName ?? 'someone');
  const email = typeof data.email === 'string' ? data.email : undefined;

  return {
    from: `Senoia Area Historical Society <website@${VERIFIED_SENDER_DOMAIN}>`,
    to: SUBMISSION_RECIPIENT,
    replyTo: email,
    subject: `${label} from ${who}`,
    html: shell(label, [
      row('Name', data.name ?? data.contactName),
      row('Business', data.businessName),
      row('Email', data.email),
      row('Phone', data.phone),
      row('Website', data.website),
      row('Message', data.message),
      row('Products', data.productDescription),
      row('Submitted', data.submittedAt),
    ].join('')),
  };
}

export interface VolunteerConfirmationInput {
  firstName?: unknown;
  email?: unknown;
  slotLabel?: unknown;
  slotTimeNote?: unknown;
  shiftDuration?: unknown;
  sheetTitle?: unknown;
  eventDate?: unknown;
  eventLocation?: unknown;
}

/** Confirmation sent to a volunteer once their registration document exists. */
export function buildVolunteerConfirmationEmail(input: VolunteerConfirmationInput): SubmissionEmail {
  const title = String(input.sheetTitle ?? 'the event');
  return {
    from: `Senoia Area Historical Society <volunteers@${VERIFIED_SENDER_DOMAIN}>`,
    to: String(input.email ?? ''),
    replyTo: SUBMISSION_RECIPIENT,
    subject: `You're signed up! – ${title}`,
    html: `
<div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2c2c2c;">
  <h2 style="color: #8B6914;">Senoia Area Historical Society</h2>
  <p>Hi ${escapeHtml(input.firstName ?? 'there')},</p>
  <p>Thank you for volunteering for <strong>${escapeHtml(title)}</strong>! Here are your signup details:</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">${[
    row('Role', input.slotLabel),
    row('Time', input.slotTimeNote),
    row('Duration', input.shiftDuration),
    row('Date', input.eventDate),
    row('Location', input.eventLocation),
  ].join('')}</table>
  <p>We look forward to seeing you there! If you have any questions, please contact us at
    <a href="mailto:${SUBMISSION_RECIPIENT}">${SUBMISSION_RECIPIENT}</a>.</p>
  <p style="color: #888; font-size: 13px; margin-top: 32px;">Senoia Area Historical Society &bull; Senoia, GA</p>
</div>`.trim(),
  };
}
