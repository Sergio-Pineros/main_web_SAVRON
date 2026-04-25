import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Do NOT instantiate Resend at module level — env vars aren't available at build time.
// It is created lazily inside the POST handler instead.

// Apple Wallet env vars
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const WALLET_WWDR_CERT = process.env.WALLET_WWDR_CERT;
const PASSPHRASE = process.env.WALLET_PASSPHRASE;
const PASS_TYPE_ID = process.env.PASS_TYPE_ID;
const TEAM_ID = process.env.TEAM_ID;

// Google Wallet env vars
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
const CLASS_ID = process.env.GOOGLE_WALLET_CLASS_ID;

export async function POST(req: NextRequest) {
    try {
        // Instantiate Resend lazily — env vars are only available at request time, not build time
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }
        const resend = new Resend(resendApiKey);

        // Auth
        const apiKey = req.headers.get('x-api-key');
        const expectedKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_SECRET_KEY || 'development_fallback_key';
        if (apiKey !== expectedKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse body
        const body = await req.json();
        const { name, email } = body;
        if (!name || !email) {
            return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
        }

        // ─── Generate Apple Wallet Pass ─────────────────────────────────────
        let applePassBuffer: Buffer | null = null;
        try {
            if (WALLET_PRIVATE_KEY && WALLET_WWDR_CERT && PASS_TYPE_ID && TEAM_ID) {
                const signerKey = Buffer.from(WALLET_PRIVATE_KEY, 'base64');
                const wwdrCert = Buffer.from(WALLET_WWDR_CERT, 'base64');

                const buffers: Record<string, Buffer> = {};
                const logoPath = path.join(process.cwd(), 'public', 'logo.png');
                if (fs.existsSync(logoPath)) {
                    const logoBuffer = fs.readFileSync(logoPath);
                    buffers['logo.png'] = logoBuffer;
                    buffers['icon.png'] = logoBuffer;
                }

                const pass = new PKPass(buffers, {
                    wwdr: wwdrCert,
                    signerCert: signerKey,
                    signerKey: signerKey,
                    signerKeyPassphrase: PASSPHRASE,
                }, {
                    description: 'Savron Membership',
                    organizationName: 'SAVRON',
                    passTypeIdentifier: PASS_TYPE_ID,
                    teamIdentifier: TEAM_ID,
                    serialNumber: uuidv4(),
                    backgroundColor: 'rgb(20, 20, 18)',
                    labelColor: 'rgb(140, 136, 128)',
                    foregroundColor: 'rgb(232, 228, 220)',
                    logoText: 'SAVRON',
                    userInfo: { email },
                });

                pass.type = 'storeCard';
                pass.primaryFields.push({ key: 'tier', label: 'MEMBER', value: 'SAVRON MEMBER' });
                pass.secondaryFields.push({ key: 'name', label: 'NAME', value: name });
                pass.auxiliaryFields.push({ key: 'email', label: 'EMAIL', value: email, textAlignment: 'PKTextAlignmentRight' });

                applePassBuffer = await pass.getAsBuffer() as unknown as Buffer;
            }
        } catch (err) {
            console.error('Apple pass generation failed:', err);
        }

        // ─── Generate Google Wallet URL ──────────────────────────────────────
        let googleSaveUrl: string | null = null;
        try {
            if (ISSUER_ID && SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && CLASS_ID) {
                const passObject = {
                    id: `${ISSUER_ID}.${uuidv4()}`,
                    classId: CLASS_ID,
                    genericType: 'GENERIC_TYPE_UNSPECIFIED',
                    hexBackgroundColor: '#141412',
                    logo: {
                        sourceUri: {
                            uri: process.env.GOOGLE_WALLET_LOGO_URL || 'https://storage.googleapis.com/wallet-ux-resources/pass-types/generic/logo.png',
                        },
                    },
                    cardTitle: { defaultValue: { language: 'en-US', value: 'SAVRON' } },
                    header: { defaultValue: { language: 'en-US', value: 'SAVRON MEMBER' } },
                    primaryFields: [{ id: 'name', label: 'NAME', value: name }],
                    secondaryFields: [{ id: 'email', label: 'EMAIL', value: email }],
                    barcode: { type: 'QR_CODE', value: email },
                };

                const jwtPayload = {
                    iss: SERVICE_ACCOUNT_EMAIL,
                    aud: 'google',
                    typ: 'savetowallet',
                    iat: Math.floor(Date.now() / 1000),
                    payload: { genericObjects: [passObject] },
                };

                const token = jwt.sign(jwtPayload, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });
                googleSaveUrl = `https://pay.google.com/gp/v/save/${token}`;
            }
        } catch (err) {
            console.error('Google Wallet generation failed:', err);
        }

        // ─── Send Email via Resend ───────────────────────────────────────────
        const attachments = applePassBuffer
            ? [{ filename: `${name.replace(/\s+/g, '_')}_savron_pass.pkpass`, content: applePassBuffer }]
            : [];

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@savronmn.com',
            to: email,
            subject: 'SAVRON — Your Membership Pass',
            html: buildEmailHtml(name, googleSaveUrl),
            attachments,
        });

        return NextResponse.json({ success: true, message: 'Membership pass sent!' });

    } catch (error) {
        console.error('send-email route failed:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

function buildEmailHtml(name: string, googleSaveUrl: string | null): string {
    const firstName = name.split(' ')[0];

    const googleBtn = googleSaveUrl
        ? `<a href="${googleSaveUrl}" style="display:block;text-align:center;border:1px solid rgba(232,228,220,0.18);color:rgba(232,228,220,0.65);padding:16px 32px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;font-weight:400;background:rgba(232,228,220,0.03);">Save to Google Wallet &nbsp;&rarr;</a>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SAVRON — Your Membership Pass</title>
</head>
<body style="margin:0;padding:0;background-color:#141412;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#141412;">
    <!-- Top accent line -->
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:33%;height:2px;background:#141412;"></td>
            <td style="width:34%;height:2px;background:rgba(232,228,220,0.18);"></td>
            <td style="width:33%;height:2px;background:#141412;"></td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Outer padding -->
    <tr>
      <td align="center" style="padding:56px 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

          <!-- Logo row -->
          <tr>
            <td style="padding-bottom:44px;border-bottom:1px solid rgba(232,228,220,0.07);">
              <img src="https://savronmn.com/logo.png" alt="SAVRON" width="120"
                   style="display:block;border:0;opacity:0.9;" />
            </td>
          </tr>

          <!-- Section tag -->
          <tr>
            <td style="padding-top:44px;padding-bottom:18px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                        letter-spacing:0.4em;text-transform:uppercase;
                        color:rgba(232,228,220,0.28);font-weight:400;">
                001 &mdash; Access Confirmed
              </p>
            </td>
          </tr>

          <!-- Display heading -->
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;
                         font-size:52px;font-weight:400;line-height:1.0;
                         letter-spacing:-0.02em;color:#e8e4dc;">
                Your pass<br/>is ready.
              </h1>
            </td>
          </tr>

          <!-- Italic quote -->
          <tr>
            <td style="padding-bottom:44px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;
                         font-style:italic;font-size:18px;font-weight:400;
                         line-height:1.65;color:rgba(232,228,220,0.42);">
                &ldquo;Some things are not announced.<br/>They are simply experienced.&rdquo;
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:44px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:40%;height:1px;background:rgba(232,228,220,0.1);"></td>
                  <td style="width:60%;height:1px;background:transparent;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding-bottom:52px;">
              <p style="margin:0 0 18px 0;font-family:Helvetica,Arial,sans-serif;
                         font-size:15px;font-weight:300;line-height:1.0;
                         color:rgba(232,228,220,0.5);">
                ${firstName},
              </p>
              <p style="margin:0 0 18px 0;font-family:Helvetica,Arial,sans-serif;
                         font-size:15px;font-weight:300;line-height:1.85;
                         color:rgba(232,228,220,0.5);">
                Your SAVRON membership pass has been issued. This is not a confirmation email &mdash; it is something far more deliberate. It is your standing access to a space built for men who move differently through the world.
              </p>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;
                         font-size:15px;font-weight:300;line-height:1.85;
                         color:rgba(232,228,220,0.5);">
                Save it to your wallet below. It will be there when you need it &mdash; quiet, precise, and exactly where it belongs.
              </p>
            </td>
          </tr>

          <!-- Section tag 002 -->
          <tr>
            <td style="padding-bottom:18px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                        letter-spacing:0.4em;text-transform:uppercase;
                        color:rgba(232,228,220,0.28);font-weight:400;">
                002 &mdash; Add to Wallet
              </p>
            </td>
          </tr>

          <!-- Apple Wallet block -->
          <tr>
            <td style="padding-bottom:8px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(232,228,220,0.09);
                            background:rgba(232,228,220,0.025);">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;
                               font-size:9px;letter-spacing:0.3em;text-transform:uppercase;
                               color:rgba(232,228,220,0.35);font-weight:400;">
                      Apple Wallet
                    </p>
                    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;
                               font-size:13px;font-weight:300;line-height:1.75;
                               color:rgba(232,228,220,0.4);">
                      Open this email on your iPhone and tap the
                      <span style="color:rgba(232,228,220,0.6);">.pkpass</span>
                      attachment below. It loads directly in Apple Wallet &mdash; no download required.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${googleSaveUrl ? `
          <!-- Google Wallet block -->
          <tr>
            <td style="padding-bottom:0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(232,228,220,0.09);
                            background:rgba(232,228,220,0.025);">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px 0;font-family:Helvetica,Arial,sans-serif;
                               font-size:9px;letter-spacing:0.3em;text-transform:uppercase;
                               color:rgba(232,228,220,0.35);font-weight:400;">
                      Google Wallet
                    </p>
                    ${googleBtn}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="padding:56px 20px 44px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32%;height:1px;background:rgba(232,228,220,0.07);"></td>
                  <td style="width:68%;height:1px;"></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                               letter-spacing:0.32em;text-transform:uppercase;
                               color:rgba(232,228,220,0.18);font-weight:400;">
                      SAVRON
                    </p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                               letter-spacing:0.2em;text-transform:uppercase;
                               color:rgba(232,228,220,0.18);font-weight:400;">
                      North Loop &nbsp;&middot;&nbsp; Minneapolis
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Bottom accent -->
    <tr>
      <td style="height:1px;background:rgba(232,228,220,0.04);"></td>
    </tr>

  </table>
</body>
</html>`;
}
