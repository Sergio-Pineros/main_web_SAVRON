// Pre-built HTML email templates for CRM campaigns
// All templates match the booking confirmation email style with blue (#0D3B4F) header

const LOGO_URL = 'https://savronmn.com/logo.png';

function wrapTemplate(innerHtml: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#121212;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0D3B4F;padding:28px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="SAVRON" width="160" style="display:block;margin:0 auto 8px;max-width:160px;height:auto;" />
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:3px;text-transform:uppercase;">Barbershop &amp; Lounge · Minneapolis</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            ${innerHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;letter-spacing:1px;">
              SAVRON Barbershop &amp; Lounge · Minneapolis, MN · <a href="https://savronmn.com" style="color:rgba(255,255,255,0.3);">savronmn.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function getMissYouTemplate(clientName: string): { subject: string; html: string } {
    const firstName = clientName?.split(' ')[0] || 'friend';
    return {
        subject: "It's been a while — we'd love to see you again",
        html: wrapTemplate(`
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">We Miss You</p>
            <h1 style="margin:0 0 20px;color:#fff;font-size:24px;letter-spacing:2px;text-transform:uppercase;">Hey ${firstName}, it's been a while.</h1>
            <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
                Your chair is waiting. Whether it's a fresh fade, a clean lineup, or just a change of pace — we've got you covered.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                    <td style="background:#0D3B4F;padding:14px 28px;">
                        <a href="https://savronmn.com/booking" style="color:#fff;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Book Now</a>
                    </td>
                </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                See you soon. 💈
            </p>
        `),
    };
}

export function getSpecialOfferTemplate(clientName: string, offerText: string): { subject: string; html: string } {
    const firstName = clientName?.split(' ')[0] || 'friend';
    return {
        subject: "A special offer just for you — SAVRON",
        html: wrapTemplate(`
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Exclusive Offer</p>
            <h1 style="margin:0 0 20px;color:#fff;font-size:24px;letter-spacing:2px;text-transform:uppercase;">${firstName}, this one's for you.</h1>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;">
                <tr>
                    <td style="padding:20px 24px;text-align:center;">
                        <p style="margin:0;color:#1A6A8A;font-size:18px;font-weight:700;letter-spacing:2px;">${offerText}</p>
                    </td>
                </tr>
            </table>
            <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
                Book your next appointment and take advantage of this exclusive offer. Limited time only.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                    <td style="background:#0D3B4F;padding:14px 28px;">
                        <a href="https://savronmn.com/booking" style="color:#fff;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Book Now</a>
                    </td>
                </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                See you soon. 💈
            </p>
        `),
    };
}

export function getCustomTemplate(clientName: string, subject: string, message: string): { subject: string; html: string } {
    const firstName = clientName?.split(' ')[0] || 'friend';
    const escapedMessage = message.replace(/\n/g, '<br>');
    return {
        subject,
        html: wrapTemplate(`
            <h1 style="margin:0 0 20px;color:#fff;font-size:24px;letter-spacing:2px;text-transform:uppercase;">Hey ${firstName},</h1>
            <p style="margin:0 0 24px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
                ${escapedMessage}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                    <td style="background:#0D3B4F;padding:14px 28px;">
                        <a href="https://savronmn.com/booking" style="color:#fff;text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Book Now</a>
                    </td>
                </tr>
            </table>
            <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6;">
                — The SAVRON Team 💈
            </p>
        `),
    };
}
