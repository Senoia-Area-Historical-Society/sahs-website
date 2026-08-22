import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Preview,
} from 'react-email';

export interface TicketConfirmationEmailProps {
  customerName?: string;
  eventTitle: string;
  /** Pre-formatted by `formatEventWhen` — never format a naive date in here. */
  eventWhen?: string | null;
  eventLocation?: string | null;
  quantity: number;
  confirmationNumber: string;
  ticketUrl: string;
}

const brown = '#6b5c3e';
const darkBrown = '#3a3228';
const cream = '#f5f0e8';
const lightCream = '#faf7f2';
const bodyFont = 'Georgia, serif';
const uiFont = 'Arial, sans-serif';

export function TicketConfirmationEmail({
  customerName, eventTitle, eventWhen, eventLocation, quantity, confirmationNumber, ticketUrl,
}: TicketConfirmationEmailProps) {
  const name = (customerName || '').trim() || 'Friend';
  const ticketWord = quantity === 1 ? 'ticket' : 'tickets';

  return (
    <Html lang="en">
      <Head />
      {/* Leads with the confirmation number: for many recipients the preview line is the
          only thing they read before arriving at the door. */}
      <Preview>{`Confirmation ${confirmationNumber} — ${quantity} ${ticketWord} for ${eventTitle}`}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: cream, fontFamily: bodyFont }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

          <Section style={{ backgroundColor: brown, padding: '32px 40px', textAlign: 'center', borderRadius: '8px 8px 0 0' }}>
            <Text style={{ margin: 0, fontFamily: bodyFont, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#d4c4a0' }}>
              Senoia Area Historical Society
            </Text>
            <Text style={{ margin: '12px 0 0', fontFamily: bodyFont, fontSize: 26, color: '#ffffff', lineHeight: '1.3' }}>
              Your {ticketWord} are confirmed
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#ffffff', padding: '40px 40px 32px' }}>
            <Text style={{ margin: '0 0 20px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              Dear {name},
            </Text>
            <Text style={{ margin: '0 0 28px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              Thank you — your purchase is complete and we look forward to seeing you.
              Everything you need to get in is below.
            </Text>

            {/* The confirmation number is the ticket. `verifyTicket` scans by this value,
                so it is set large and centered: a buyer can be admitted by reading it
                aloud, with no QR, no attachment and no phone signal. */}
            <Section style={{ backgroundColor: lightCream, border: `1px solid #e8dfd0`, borderRadius: 6, padding: '24px', textAlign: 'center', marginBottom: 28 }}>
              <Text style={{ margin: '0 0 8px', fontFamily: uiFont, fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: brown }}>
                Confirmation Number
              </Text>
              <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 32, fontWeight: 'bold', letterSpacing: 4, color: darkBrown }}>
                {confirmationNumber}
              </Text>
              <Text style={{ margin: '12px 0 0', fontFamily: uiFont, fontSize: 13, color: '#7a6a5a', lineHeight: '1.5' }}>
                Show this at the door — we can check you in with this number alone.
              </Text>
            </Section>

            <DetailRow label="Event" value={eventTitle} />
            {eventWhen ? <DetailRow label="When" value={eventWhen} /> : null}
            {eventLocation ? <DetailRow label="Where" value={eventLocation} /> : null}
            <DetailRow label="Tickets" value={`${quantity} ${ticketWord}`} />

            <Section style={{ textAlign: 'center', padding: '32px 0 8px' }}>
              <Button href={ticketUrl} style={{ display: 'inline-block', backgroundColor: brown, color: '#ffffff', fontFamily: uiFont, fontSize: 13, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', padding: '14px 32px', borderRadius: 4 }}>
                View Your Ticket &amp; QR Code
              </Button>
            </Section>
            <Text style={{ margin: '8px 0 0', fontFamily: uiFont, fontSize: 13, color: '#7a6a5a', textAlign: 'center', lineHeight: '1.6' }}>
              Your QR code is also attached to this email, so you can save it now and scan
              it at the door without a signal.
            </Text>

            <Hr style={{ borderColor: '#e8dfd0', margin: '32px 0 20px' }} />

            <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 13, color: '#7a6a5a', lineHeight: '1.7' }}>
              Questions, or need to change your order? Reply to this email or contact us at{' '}
              <a href="https://senoiahistory.com/contact-sahs" style={{ color: brown }}>senoiahistory.com/contact-sahs</a>.
            </Text>
          </Section>

          <Section style={{ backgroundColor: cream, padding: '20px 40px', borderRadius: '0 0 8px 8px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 12, color: '#8a7a6a', lineHeight: '1.6' }}>
              Senoia Area Historical Society · 6 Couch Street, Senoia, GA 30276
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Section style={{ padding: '12px 16px', borderLeft: `3px solid ${brown}`, backgroundColor: lightCream, marginBottom: 10 }}>
      <Text style={{ margin: '0 0 2px', fontFamily: uiFont, fontSize: 10, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: brown }}>
        {label}
      </Text>
      <Text style={{ margin: 0, fontFamily: bodyFont, fontSize: 16, color: darkBrown, lineHeight: '1.5' }}>
        {value}
      </Text>
    </Section>
  );
}
