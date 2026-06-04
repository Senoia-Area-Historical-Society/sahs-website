/**
 * SAHS member welcome email — sent once via Resend when a new membership
 * checkout completes. Edit this file to update email content; redeploy functions
 * to push changes. For a richer authoring experience see Option 3 (React Email).
 */
export function welcomeEmailHtml(firstName?: string): string {
  const name = firstName || 'Friend';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your SAHS Membership</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Georgia,serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#6b5c3e;padding:32px 40px;text-align:center;border-radius:8px 8px 0 0;">
              <p style="margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d4c4a0;">
                Senoia Area Historical Society
              </p>
              <h1 style="margin:12px 0 0;font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;line-height:1.3;">
                Thank You for Your Membership
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#3a3228;">
                Dear ${name},
              </p>

              <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#3a3228;">
                We are sincerely grateful for your ongoing support and active membership in the <strong>Senoia Area Historical Society</strong>. Your commitment helps us preserve and share the stories, structures, and heritage of Senoia and the surrounding region &mdash; and that work simply wouldn&rsquo;t be possible without members like you.
              </p>

              <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:17px;line-height:1.7;color:#3a3228;">
                Here&rsquo;s a reminder of everything your membership includes.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="border-top:1px solid #e8dfd0;"></td></tr>
              </table>

              <!-- Member Benefits -->
              <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#6b5c3e;">
                Your Membership Includes
              </h2>

              <!-- Monthly Programs -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #6b5c3e;background-color:#faf7f2;">
                    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Monthly Programs</p>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                      Evening presentations on local history held on the <strong>second Thursday of each month</strong> at the SAHS Museum, 6 Couch Street. Doors open at 6:30&nbsp;PM; programs begin at 7:00&nbsp;PM. Open to all members.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Museum Access -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #6b5c3e;background-color:#faf7f2;">
                    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Museum Access</p>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                      Visit our collections and archives at 6 Couch Street, Senoia, GA. Open <strong>every Saturday and Sunday from 1:00&nbsp;PM to 4:00&nbsp;PM</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Community Events -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #6b5c3e;background-color:#faf7f2;">
                    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Community Events</p>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                      Special events, historic tours, and commemorations throughout the year &mdash; including our summer events and signature fundraisers.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Newsletter - Coming Soon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #a09080;background-color:#faf7f2;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Member Newsletter</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                            Updates on SAHS news, upcoming programs, and preservation projects delivered directly to your inbox.
                          </p>
                        </td>
                        <td align="right" style="padding-left:12px;white-space:nowrap;vertical-align:top;">
                          <span style="display:inline-block;background-color:#f0e8d8;border:1px solid #c4a87a;color:#7a5c2e;font-family:Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:12px;">
                            Coming Soon
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Digital Archives - Coming Soon features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #a09080;background-color:#faf7f2;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Digital Archives &mdash; Member Features</p>
                          <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                            Our digital archives at <a href="https://archives.senoiahistory.com" style="color:#6b5c3e;">archives.senoiahistory.com</a> are available to all. Exciting member-exclusive features are on their way, including the ability to add research notes and comments, save documents and photographs to a personal Favorites collection, and download full high-resolution images for your own research.
                          </p>
                        </td>
                        <td align="right" style="padding-left:12px;white-space:nowrap;vertical-align:top;">
                          <span style="display:inline-block;background-color:#f0e8d8;border:1px solid #c4a87a;color:#7a5c2e;font-family:Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:12px;">
                            Coming Soon
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Meeting Room -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:14px 16px;border-left:3px solid #6b5c3e;background-color:#faf7f2;">
                    <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#3a3228;">Meeting Room at the Carmichael House</p>
                    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;color:#5a4a3a;line-height:1.6;">
                      SAHS members receive a <strong>$50 discount</strong> on meeting room bookings at the historic Carmichael House &mdash; an ideal venue for small gatherings, workshops, and events in the heart of Senoia.
                    </p>
                    <a href="https://senoiahistory.com/meeting-room" style="display:inline-block;background-color:#6b5c3e;color:#ffffff;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:8px 16px;border-radius:4px;">Check Availability</a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="border-top:1px solid #e8dfd0;"></td></tr>
              </table>

              <!-- CTAs -->
              <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#6b5c3e;">
                Stay Connected
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td style="background-color:#f5f0e8;border-radius:6px;padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#3a3228;">Upcoming Events &amp; News</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#7a6a5a;">Browse programs and community events on our website.</p>
                        </td>
                        <td align="right" style="padding-left:16px;white-space:nowrap;">
                          <a href="https://senoiahistory.com/news" style="display:inline-block;background-color:#6b5c3e;color:#ffffff;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:4px;">View Events</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background-color:#f5f0e8;border-radius:6px;padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#3a3228;">Check Your Membership Status</p>
                          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#7a6a5a;">View your membership level and renewal date anytime.</p>
                        </td>
                        <td align="right" style="padding-left:16px;white-space:nowrap;">
                          <a href="https://senoiahistory.com/membership-status" style="display:inline-block;background-color:#6b5c3e;color:#ffffff;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:4px;">My Membership</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="border-top:1px solid #e8dfd0;"></td></tr>
              </table>

              <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#3a3228;">
                Questions? We&rsquo;d love to hear from you.
              </p>
              <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7a6a5a;">
                6 Couch Street, Senoia, GA 30276
              </p>
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;color:#7a6a5a;">
                <a href="https://senoiahistory.com/contact-sahs" style="color:#6b5c3e;text-decoration:none;">senoiahistory.com/contact-sahs</a>
              </p>

              <p style="margin:0;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#3a3228;">
                With gratitude,<br>
                <strong>The Senoia Area Historical Society</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#3a3228;padding:24px 40px;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a09080;">
                Senoia Area Historical Society
              </p>
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#6a5a4a;">
                6 Couch Street &middot; Senoia, GA 30276 &middot; Open Sat &amp; Sun 1&ndash;4 PM
              </p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#6a5a4a;">
                You&rsquo;re receiving this as an active SAHS member.<br>
                <a href="https://senoiahistory.com/contact-sahs" style="color:#a09080;">Manage email preferences</a> &middot;
                <a href="https://senoiahistory.com/privacy-policy" style="color:#a09080;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
