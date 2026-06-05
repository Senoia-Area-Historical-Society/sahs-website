import {
  Html, Head, Body, Container, Section, Text, Button,
  Link, Hr, Preview, Row, Column,
} from 'react-email';

export interface NewsletterSection {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface NewsletterEmailProps {
  subject: string;
  previewText: string;
  intro: string;
  sections: NewsletterSection[];
  issueLabel?: string; // e.g. "June 2026"
}

const brown = '#6b5c3e';
const darkBrown = '#3a3228';
const cream = '#f5f0e8';
const lightCream = '#faf7f2';
const mutedBrown = '#a09080';
const bodyFont = 'Georgia, serif';
const uiFont = 'Arial, sans-serif';

export function NewsletterEmail({ previewText, intro, sections, issueLabel }: NewsletterEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: cream, fontFamily: bodyFont }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

          {/* Header */}
          <Section style={{ backgroundColor: brown, padding: '32px 40px', textAlign: 'center', borderRadius: '8px 8px 0 0' }}>
            <Text style={{ margin: 0, fontFamily: bodyFont, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#d4c4a0' }}>
              Senoia Area Historical Society
            </Text>
            <Text style={{ margin: '12px 0 4px', fontFamily: bodyFont, fontSize: 26, fontWeight: 'normal', color: '#ffffff', lineHeight: '1.3' }}>
              Member Newsletter
            </Text>
            {issueLabel && (
              <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#d4c4a0', opacity: 0.8 }}>
                {issueLabel}
              </Text>
            )}
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: '#ffffff', padding: '40px 40px 32px' }}>

            {/* Intro */}
            <Text style={{ margin: '0 0 28px', fontFamily: bodyFont, fontSize: 17, lineHeight: '1.7', color: darkBrown }}>
              {intro}
            </Text>

            <Hr style={{ borderColor: '#e8dfd0', margin: '0 0 28px' }} />

            {/* Dynamic sections */}
            {sections.map((section, i) => (
              <section key={i} style={{ display: 'block' }}>
                <Section style={{ padding: '18px 20px', borderLeft: `3px solid ${brown}`, backgroundColor: lightCream, marginBottom: 20 }}>
                  <Text style={{ margin: '0 0 8px', fontFamily: bodyFont, fontSize: 16, fontWeight: 'bold', color: darkBrown }}>
                    {section.title}
                  </Text>
                  <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 14, color: '#5a4a3a', lineHeight: '1.7' }}>
                    {section.body}
                  </Text>
                  {section.ctaLabel && section.ctaUrl && (
                    <Button
                      href={section.ctaUrl}
                      style={{ marginTop: 12, backgroundColor: brown, color: '#ffffff', fontFamily: uiFont, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', padding: '8px 16px', borderRadius: 4 }}
                    >
                      {section.ctaLabel}
                    </Button>
                  )}
                </Section>
              </section>
            ))}

            <Hr style={{ borderColor: '#e8dfd0', margin: '0 0 28px' }} />

            {/* Upcoming Programs reminder */}
            <Section style={{ backgroundColor: cream, borderRadius: 6, padding: '16px 20px', marginBottom: 12 }}>
              <Row>
                <Column>
                  <Text style={{ margin: '0 0 4px', fontFamily: bodyFont, fontSize: 14, fontWeight: 'bold', color: darkBrown }}>Monthly Program</Text>
                  <Text style={{ margin: 0, fontFamily: uiFont, fontSize: 13, color: '#7a6a5a' }}>2nd Thursday · 6:30 PM doors · 7:00 PM program · 6 Couch St</Text>
                </Column>
                <Column style={{ width: 120, verticalAlign: 'middle', paddingLeft: 16 }}>
                  <Button href="https://senoiahistory.com/news" style={{ display: 'inline-block', backgroundColor: brown, color: '#ffffff', fontFamily: uiFont, fontSize: 12, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none', padding: '10px 16px', borderRadius: 4 }}>
                    View Events
                  </Button>
                </Column>
              </Row>
            </Section>

            <Text style={{ margin: '28px 0 0', fontFamily: bodyFont, fontSize: 15, lineHeight: '1.7', color: darkBrown }}>
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
