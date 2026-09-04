import { describe, it, expect } from 'vitest';
import {
  buildSubmissionEmail,
  buildVolunteerConfirmationEmail,
  escapeHtml,
  VERIFIED_SENDER_DOMAIN,
  SUBMISSION_RECIPIENT,
} from '../../functions/src/notifyEmailContent';

/**
 * `notifyEmailContent.ts` is imported here deliberately, and that import is why the
 * module has no imports of its own: the site's `tsc -b` follows it, and the site
 * tsconfig has neither `@types/node` nor the functions dependencies. See CLAUDE.md.
 */

describe('sender domain', () => {
  // The regression: the Trigger Email extension sent as `@senoiahistory.com`, which
  // is not a verified Resend domain. All sixteen messages it queued between April and
  // August 2026 failed with `550 The senoiahistory.com domain is not verified` —
  // including two real enquiries from the public contact form, which nobody ever saw.
  it('sends only from the verified subdomain, never the bare apex domain', () => {
    const mails = [
      buildSubmissionEmail({ type: 'contact', name: 'Pat', email: 'pat@example.com' }),
      buildSubmissionEmail({ type: 'vendor', businessName: 'Pies', email: 'pat@example.com' }),
      buildVolunteerConfirmationEmail({ email: 'pat@example.com', sheetTitle: 'Family Day' }),
    ];
    for (const mail of mails) {
      expect(mail.from).toContain(`@${VERIFIED_SENDER_DOMAIN}`);
      expect(mail.from).not.toMatch(/@senoiahistory\.com>/);
    }
  });

  it('replies go to the submitter, but the envelope stays on the verified domain', () => {
    const mail = buildSubmissionEmail({ type: 'contact', name: 'Pat', email: 'pat@example.com' });
    expect(mail.replyTo).toBe('pat@example.com');
    expect(mail.from).toContain(VERIFIED_SENDER_DOMAIN);
    expect(mail.to).toBe(SUBMISSION_RECIPIENT);
  });
});

describe('escaping', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`))
      .toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  });

  it('renders null and undefined as empty, not as the words', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  // Every field here comes from a public, unauthenticated form. The previous
  // client-side template interpolated `name` and `message` raw.
  it('neutralises markup submitted through the contact form', () => {
    const mail = buildSubmissionEmail({
      type: 'contact',
      name: '<img src=x onerror=alert(1)>',
      email: 'pat@example.com',
      message: 'Hello <b>there</b>',
    });
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).not.toContain('<b>there</b>');
    expect(mail.html).toContain('&lt;img src=x');
  });

  it('keeps the subject line free of raw submitted markup', () => {
    const mail = buildSubmissionEmail({ type: 'contact', name: 'A<B', email: 'a@b.com' });
    // The subject is plain text in the mail headers, so it is not escaped — assert it
    // is at least carried verbatim rather than silently mangled.
    expect(mail.subject).toBe('Contact form message from A<B');
  });
});

describe('submission notification', () => {
  it('labels each submission type distinctly', () => {
    expect(buildSubmissionEmail({ type: 'contact', email: 'a@b.com' }).subject).toContain('Contact form message');
    expect(buildSubmissionEmail({ type: 'vendor', email: 'a@b.com' }).subject).toContain('Vendor application');
    expect(buildSubmissionEmail({ type: 'sponsor', email: 'a@b.com' }).subject).toContain('Sponsor application');
  });

  it('falls back to a generic label for an unrecognised type', () => {
    expect(buildSubmissionEmail({ type: 'something-new', email: 'a@b.com' }).subject)
      .toContain('Website submission');
  });

  it('omits rows for fields the form did not supply', () => {
    const mail = buildSubmissionEmail({ type: 'contact', name: 'Pat', email: 'pat@example.com' });
    expect(mail.html).not.toContain('Products');
    expect(mail.html).not.toContain('Business');
    expect(mail.html).toContain('Pat');
  });

  it('renders a vendor application with its own fields', () => {
    const mail = buildSubmissionEmail({
      type: 'vendor', businessName: 'Pat’s Pies', contactName: 'Pat',
      email: 'pat@example.com', phone: '770-555-0100',
      productDescription: 'Hand pies', website: 'https://example.com',
    });
    expect(mail.html).toContain('Pat’s Pies');
    expect(mail.html).toContain('Hand pies');
    expect(mail.subject).toBe('Vendor application from Pat');
  });

  it('turns newlines in a message into line breaks', () => {
    const mail = buildSubmissionEmail({ type: 'contact', email: 'a@b.com', message: 'one\ntwo' });
    expect(mail.html).toContain('one<br>two');
  });
});

describe('volunteer confirmation', () => {
  it('addresses the volunteer and names the sheet', () => {
    const mail = buildVolunteerConfirmationEmail({
      firstName: 'Pat', email: 'pat@example.com', sheetTitle: 'Family Day',
      slotLabel: 'Greeter', slotTimeNote: '9–11am', eventLocation: 'Carmichael House',
    });
    expect(mail.to).toBe('pat@example.com');
    expect(mail.subject).toBe("You're signed up! – Family Day");
    expect(mail.html).toContain('Hi Pat,');
    expect(mail.html).toContain('Greeter');
    expect(mail.html).toContain('Carmichael House');
  });

  it('degrades gracefully when the sheet has no title and the slot no extras', () => {
    const mail = buildVolunteerConfirmationEmail({ firstName: 'Pat', email: 'pat@example.com' });
    expect(mail.subject).toBe("You're signed up! – the event");
    expect(mail.html).toContain('Hi Pat,');
    expect(mail.html).not.toContain('Duration');
  });

  it('leaves `to` empty when the registration carried no email, so the caller can skip the send', () => {
    expect(buildVolunteerConfirmationEmail({ firstName: 'Pat' }).to).toBe('');
  });
});
