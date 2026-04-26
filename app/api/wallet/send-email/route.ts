import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const WALLET_WWDR_CERT = process.env.WALLET_WWDR_CERT;
const PASSPHRASE = process.env.WALLET_PASSPHRASE;
const PASS_TYPE_ID = process.env.PASS_TYPE_ID;
const TEAM_ID = process.env.TEAM_ID;

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
const CLASS_ID = process.env.GOOGLE_WALLET_CLASS_ID;

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function createGooglePassObject(
    objectId: string,
    name: string,
    email: string,
    visitCount: number
): Promise<void> {
    if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !CLASS_ID) return;

    const auth = new GoogleAuth({
        credentials: {
            client_email: SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    const client = await auth.getClient();
    const passObject = buildGooglePassObject(objectId, name, email, visitCount);

    await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/genericObject`,
        method: 'POST',
        data: passObject,
    });
}

function buildGooglePassObject(
    objectId: string,
    name: string,
    email: string,
    visitCount: number
) {
    return {
        id: objectId,
        classId: CLASS_ID,
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: '#141412',
        logo: {
            sourceUri: { uri: process.env.GOOGLE_WALLET_LOGO_URL || 'https://savronmn.com/logo.png' },
        },
        cardTitle: { defaultValue: { language: 'en-US', value: 'SAVRON' } },
        header: { defaultValue: { language: 'en-US', value: 'SAVRON MEMBER' } },
        primaryFields: [{ id: 'name', label: 'NAME', value: name }],
        secondaryFields: [
            { id: 'visits', label: 'VISITS', value: visitCount.toString() },
            { id: 'email', label: 'EMAIL', value: email },
        ],
        barcode: { type: 'QR_CODE', value: email },
    };
}

function buildGoogleSaveUrl(objectId: string, name: string, email: string, visitCount: number): string {
    const passObject = buildGooglePassObject(objectId, name, email, visitCount);
    const jwtPayload = {
        iss: SERVICE_ACCOUNT_EMAIL,
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: { genericObjects: [passObject] },
    };
    const token = jwt.sign(jwtPayload, GOOGLE_PRIVATE_KEY!, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
}

async function generateApplePass(
    serialNumber: string,
    name: string,
    email: string,
    visitCount: number
): Promise<Buffer | null> {
    if (!WALLET_PRIVATE_KEY || !WALLET_WWDR_CERT || !PASS_TYPE_ID || !TEAM_ID) return null;
    try {
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
            description: 'SAVRON Membership',
            organizationName: 'SAVRON',
            passTypeIdentifier: PASS_TYPE_ID,
            teamIdentifier: TEAM_ID,
            serialNumber,
            backgroundColor: 'rgb(20, 20, 18)',
            labelColor: 'rgb(140, 136, 128)',
            foregroundColor: 'rgb(232, 228, 220)',
            logoText: 'SAVRON',
            userInfo: { email },
        });

        pass.type = 'storeCard';
        pass.primaryFields.push({ key: 'tier', label: 'MEMBER', value: 'SAVRON MEMBER' });
        pass.secondaryFields.push({ key: 'name', label: 'NAME', value: name });
        pass.auxiliaryFields.push(
            { key: 'visits', label: 'VISITS', value: visitCount.toString() },
            { key: 'email', label: 'EMAIL', value: email, textAlignment: 'PKTextAlignmentRight' }
        );

        return await pass.getAsBuffer() as unknown as Buffer;
    } catch (err) {
        console.error('Apple pass generation failed:', err);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
        }
        const resend = new Resend(resendApiKey);

        const body = await req.json();
        const { name, email, phone } = body;
        if (!name?.trim() || !email?.trim()) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Check if already subscribed
        const { data: existing } = await supabase
            .from('email_subscribers')
            .select('id, email')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'This email is already on the list.' }, { status: 409 });
        }

        const serialNumber = uuidv4();
        const googleObjectId = `${ISSUER_ID}.${uuidv4().replace(/-/g, '')}`;

        // Save subscriber first
        const { error: dbError } = await supabase.from('email_subscribers').insert({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone?.trim() || null,
            pass_serial_number: serialNumber,
            google_pass_object_id: googleObjectId,
            visit_count: 0,
        });

        if (dbError) {
            console.error('DB insert failed:', dbError);
            return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 });
        }

        // Create Google Wallet pass object (so it can be updated later)
        try {
            await createGooglePassObject(googleObjectId, name.trim(), email.toLowerCase().trim(), 0);
        } catch (err) {
            console.error('Google Wallet object creation failed (non-fatal):', err);
        }

        // Generate Google save URL
        let googleSaveUrl: string | null = null;
        if (ISSUER_ID && SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && CLASS_ID) {
            try {
                googleSaveUrl = buildGoogleSaveUrl(googleObjectId, name.trim(), email.trim(), 0);
            } catch (err) {
                console.error('Google Wallet JWT failed:', err);
            }
        }

        // Generate Apple pass
        const applePassBuffer = await generateApplePass(serialNumber, name.trim(), email.trim(), 0);

        const attachments = applePassBuffer
            ? [{ filename: `${name.trim().replace(/\s+/g, '_')}_savron_pass.pkpass`, content: applePassBuffer }]
            : [];

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@savronmn.com',
            to: email.trim(),
            subject: 'SAVRON — Your Membership Pass',
            html: buildEmailHtml(name.trim(), googleSaveUrl),
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
    <tr>
      <td align="center" style="padding:56px 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
          <tr>
            <td style="padding-bottom:44px;border-bottom:1px solid rgba(232,228,220,0.07);">
              <img src="https://savronmn.com/logo.png" alt="SAVRON" width="120"
                   style="display:block;border:0;opacity:0.9;" />
            </td>
          </tr>
          <tr>
            <td style="padding-top:44px;padding-bottom:18px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                        letter-spacing:0.4em;text-transform:uppercase;
                        color:rgba(232,228,220,0.28);font-weight:400;">
                001 &mdash; Access Confirmed
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;
                         font-size:52px;font-weight:400;line-height:1.0;
                         letter-spacing:-0.02em;color:#e8e4dc;">
                Your pass<br/>is ready.
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:44px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;
                         font-style:italic;font-size:18px;font-weight:400;
                         line-height:1.65;color:rgba(232,228,220,0.42);">
                &ldquo;Some things are not announced.<br/>They are simply experienced.&rdquo;
              </p>
            </td>
          </tr>
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
                Your SAVRON membership pass has been issued. Save it to your wallet — it will be there when you need it, quiet and precise.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:18px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:9px;
                        letter-spacing:0.4em;text-transform:uppercase;
                        color:rgba(232,228,220,0.28);font-weight:400;">
                002 &mdash; Add to Wallet
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(232,228,220,0.09);background:rgba(232,228,220,0.025);">
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
                      attachment below to add directly to Apple Wallet.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${googleSaveUrl ? `
          <tr>
            <td style="padding-bottom:0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid rgba(232,228,220,0.09);background:rgba(232,228,220,0.025);">
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
                               color:rgba(232,228,220,0.18);font-weight:400;">SAVRON</p>
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
    <tr>
      <td style="height:1px;background:rgba(232,228,220,0.04);"></td>
    </tr>
  </table>
</body>
</html>`;
}
