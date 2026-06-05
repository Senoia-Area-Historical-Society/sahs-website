import {
  Html, Head, Body, Container, Section, Text, Button,
  Link, Hr, Preview, Row, Column,
} from 'react-email';

interface WelcomeEmailProps {
  firstName?: string;
}

const brown = '#6b5c3e';
const darkBrown = '#3a3228';
const cream = '#f5f0e8';
const lightCream = '#faf7f2';
const mutedBrown = '#a09080';
const bodyFont = 'Georgia, serif';
const uiFont = 'Arial, sans-serif';

export function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  const name = firstName || 'Friend';

  return (
    <Html lang="en">
      <Head />
      <Preview>We're grateful for your ongoing support of the Senoia Area Historical Society.</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: cream, fontFamily: bodyFont }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

          {/* Header */}
          <Section style={{ backgroundColor: brown, padding: '32px 40px', textAlign: 'center', borderRadius: '8px 8px 0 0' }}>
            <Text style={{ margin: 0, fontFamily: bodyFont, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#d4c4a0' }}>
              Senoia Area Historical Society
            </Text>
            <Text style={{ margin: '12px 0 0', fontFamily: bodyFont, fontSize: 26, fontWeight: 'normal', color: '#ffffff', lineHeight: '1.3' }}>
              Thank You for Your Membership
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: '#ffffff', padding: '40px 40px 32px' }}>
            <Text style={{ margin: '0 0 20px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              Dear {name},
            </Text>

            <Text style={{ margin: '0 0 20px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              We are sincerely grateful for your ongoing support and active membership in the{' '}
              <strong>Senoia Area Historical Society</strong>. Your commitment helps us preserve
              and share the stories, structures, and heritage of Senoia and the surrounding
              region — and that work simply wouldn't be possible without members like you.
            </Text>

            <Text style={{ margin: '0 0 28px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              Here's a reminder of everything your membership includes.
            </Text>

            <Hr style={{ borderColor: '#e8dfd0', margin: '0 0 28px' }} />

            <Text style={{ margin: '0 0 16px', fontFamily: bodyFont, fontSize: 14, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase', color: brown }}>
              Your Membership Includes
            </Text>

            {/* Monthly Programs */}
            <BenefitRow
              title="Monthly Programs"
              accent={brown}
              body="Evening presentations on local history held on the second Thursday of each month at the SAHS Museum, 6 Couch Street. Doors open at 6:30 PM; programs begin at 7:00 PM. Open to all members."
            />

            {/* Museum Access */}
            <BenefitRow
              title="Museum Access"
              accent={brown}
              body="Visit our collections and archives at 6 Couch Street, Senoia, GA. Open every Saturday and Sunday from 1:00 PM to 4:00 PM."
            />

            {/* Community Events */}
            <BenefitRow
              title="Community Events"
              accent={brown}
              body="Special events, historic tours, and commemorations throughout the year — including our summer events and signature fundraisers."
            />

            {/* Newsletter - Coming Soon */}
            <ComingSoonRow
              title="Member Newsletter"
              body="Updates on SAHS news, upcoming programs, and preservation projects delivered directly to your inbox."
            />

            {/* Digital Archives - Coming Soon */}
            <ComingSoonRow
              title="Digital Archives — Member Features"
              body="Our digital archives at archives.senoiahistory.com are available to all. Exciting member-exclusive features are on their way, including research notes and comments, a personal Favorites collection, and full high-resolution image downloads."
            />

            {/* Meeting Room */}
            <Section style={{ padding: '14px 16px', borderLeft: `3px solid ${brown}`, backgroundColor: lightCream, marginBottom: 28 }}>
              <Text style={{ margin: '0 0 4px', fontFamily: bodyFont, fontSize: 15, fontWeight: 'bold', color: darkBrown }}>
                Meeting Room at the Carmichael House
              </Text>
              <Text style={{ margin: '0 0 8px', fontFamily: uiFont, fontSize: 14, color: '#5a4a3a', lineHeight: '1.6' }}>
                SAHS members receive a <strong>$50 discount</strong> on meeting room bookings at the historic
                Carmichael House — an ideal venue for small gatherings, workshops, and events in the heart of Senoia.
              </Text>
              <Button
                href="https://senoiahistory.com/meeting-room"
                style={{ backgroundColor: brown, color: '#ffffff', fontFamily: uiFont, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', padding: '8px 16px', borderRadius: 4 }}
              >
                Check Availability
              </Button>
            </Section>

            <Hr style={{ borderColor: '#e8dfd0', margin: '0 0 28px' }} />

            <Text style={{ margin: '0 0 16px', fontFamily: bodyFont, fontSize: 14, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase', color: brown }}>
              Stay Connected
            </Text>

            <CtaRow label="Upcoming Events & News" description="Browse programs and community events on our website." buttonLabel="View Events" buttonUrl="https://senoiahistory.com/news" />
            <CtaRow label="Check Your Membership Status" description="View your membership level and renewal date anytime." buttonLabel="My Membership" buttonUrl="https://senoiahistory.com/membership-status" />

            <Hr style={{ borderColor: '#e8dfd0', margin: '0 0 28px' }} />

            <Text style={{ margin: '0 0 8px', fontFamily: bodyFont, fontSize: 15, lineHeight: '1.7', color: darkBrown }}>
              Questions? We'd love to hear from you.
            </Text>
            <Text style={{ margin: '0 0 4px', fontFamily: uiFont, fontSize: 13, color: '#7a6a5a' }}>
              6 Couch Street, Senoia, GA 30276
            </Text>
            <Text style={{ margin: '0 0 28px', fontFamily: uiFont, fontSize: 13, color: '#7a6a5a' }}>
              <Link href="https://senoiahistory.com/contact-sahs" style={{ color: brown, textDecoration: 'none' }}>
                senoiahistory.com/contact-sahs
              </Link>
            </Text>

            <Text style={{ margin: 0, fontFamily: bodyFont, fontSize: 15, lineHeight: '1.7', color: darkBrown }}>
              With gratitude,<br />
              <strong>The Senoia Area Historical Society</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: darkBrown, padding: '24px 40px', borderRadius: '0 0 8px 8px', textAlign: 'center' }}>
            <Text style={{ margin: '0 0 8px', fontFamily: uiFont, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: mutedBrown }}>
              Senoia Area Historical Society
            </Text>
            <Text style={{ margin: '0 0 8px', fontFamily: uiFont, fontSize: 11, color: '#6a5a4a' }}>
              6 Couch Street · Senoia, GA 30276 · Open Sat & Sun 1–4 PM
            </Text>
            <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 11, color: '#6a5a4a' }}>
              You're receiving this as an active SAHS member.{' '}
              <Link href="https://senoiahistory.com/contact-sahs" style={{ color: mutedBrown }}>
                Manage email preferences
              </Link>{' '}·{' '}
              <Link href="https://senoiahistory.com/privacy-policy" style={{ color: mutedBrown }}>
                Privacy Policy
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

function BenefitRow({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <Section style={{ padding: '14px 16px', borderLeft: `3px solid ${accent}`, backgroundColor: lightCream, marginBottom: 12 }}>
      <Text style={{ margin: '0 0 4px', fontFamily: bodyFont, fontSize: 15, fontWeight: 'bold', color: darkBrown }}>{title}</Text>
      <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 14, color: '#5a4a3a', lineHeight: '1.6' }}>{body}</Text>
    </Section>
  );
}

function ComingSoonRow({ title, body }: { title: string; body: string }) {
  return (
    <Section style={{ padding: '14px 16px', borderLeft: `3px solid ${mutedBrown}`, backgroundColor: lightCream, marginBottom: 12 }}>
      <Row>
        <Column>
          <Text style={{ margin: '0 0 4px', fontFamily: bodyFont, fontSize: 15, fontWeight: 'bold', color: darkBrown }}>{title}</Text>
          <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 14, color: '#5a4a3a', lineHeight: '1.6' }}>{body}</Text>
        </Column>
        <Column style={{ width: 90, verticalAlign: 'top', paddingLeft: 12 }}>
          <Text style={{ display: 'inline-block', backgroundColor: '#f0e8d8', border: '1px solid #c4a87a', color: '#7a5c2e', fontFamily: uiFont, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 12, margin: 0 }}>
            Coming Soon
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

function CtaRow({ label, description, buttonLabel, buttonUrl }: { label: string; description: string; buttonLabel: string; buttonUrl: string }) {
  return (
    <Section style={{ backgroundColor: cream, borderRadius: 6, padding: '16px 20px', marginBottom: 12 }}>
      <Row>
        <Column>
          <Text style={{ margin: '0 0 4px', fontFamily: bodyFont, fontSize: 14, fontWeight: 'bold', color: darkBrown }}>{label}</Text>
          <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 13, color: '#7a6a5a' }}>{description}</Text>
        </Column>
        <Column style={{ width: 120, verticalAlign: 'middle', paddingLeft: 16 }}>
          <Button href={buttonUrl} style={{ display: 'inline-block', backgroundColor: brown, color: '#ffffff', fontFamily: uiFont, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', padding: '10px 20px', borderRadius: 4 }}>
            {buttonLabel}
          </Button>
        </Column>
      </Row>
    </Section>
  );
}
