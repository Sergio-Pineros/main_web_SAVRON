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
            console.error('DB insert failed:', JSON.stringify(dbError, null, 2));
            return NextResponse.json({
                error: 'Failed to save subscriber',
                debug: {
                    message: dbError.message,
                    code: dbError.code,
                    details: dbError.details,
                    hint: dbError.hint,
                },
            }, { status: 500 });
        }

        // Create Google Wallet pass object + generate Apple pass IN PARALLEL for speed
        let googleSaveUrl: string | null = null;
        const canGoogle = !!(ISSUER_ID && SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && CLASS_ID);
        
        const [applePassBuffer] = await Promise.all([
            generateApplePass(serialNumber, name.trim(), email.trim(), 0),
            // Google Wallet object creation is non-blocking — don't wait for it
            canGoogle
                ? createGooglePassObject(googleObjectId, name.trim(), email.toLowerCase().trim(), 0)
                    .catch(err => console.error('Google Wallet object creation failed (non-fatal):', err))
                : Promise.resolve(),
        ]);

        // Generate Google save URL (fast — just signs a JWT locally)
        if (canGoogle) {
            try {
                googleSaveUrl = buildGoogleSaveUrl(googleObjectId, name.trim(), email.trim(), 0);
            } catch (err) {
                console.error('Google Wallet JWT failed:', err);
            }
        }

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
        ? `<a href="${googleSaveUrl}" style="display:block;text-align:center;background:#0D3B4F;color:#fff;padding:14px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Save to Google Wallet &rarr;</a>`
        : '';

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
            <img src="https://savronmn.com/logo.png" alt="SAVRON" width="160" style="display:block;margin:0 auto 8px;max-width:160px;height:auto;" />
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:3px;text-transform:uppercase;">Barbershop &amp; Lounge · Minneapolis</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Access Confirmed</p>
            <h1 style="margin:0 0 28px;color:#fff;font-size:26px;letter-spacing:2px;text-transform:uppercase;">Your pass is ready, ${firstName}.</h1>

            <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;">
              Your SAVRON membership pass has been issued. Save it to your wallet — it tracks your visits automatically and stays with you, quiet and precise.
            </p>

            <!-- Member info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Member</span><br>
                  <span style="color:#fff;font-size:15px;">${name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Status</span><br>
                  <span style="color:#1A6A8A;font-size:18px;font-weight:700;">ACTIVE MEMBER</span>
                </td>
              </tr>
            </table>

            <!-- Apple Wallet -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:8px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Apple Wallet</p>
                  <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.7;">
                    Open this email on your iPhone and tap the <strong style="color:rgba(255,255,255,0.7);">.pkpass</strong> attachment below to add directly to Apple Wallet.
                  </p>
                </td>
              </tr>
            </table>

            ${googleSaveUrl ? `
            <!-- Google Wallet -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Google Wallet</p>
                  ${googleBtn}
                </td>
              </tr>
            </table>
            ` : ''}

            <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
              Your pass will update automatically each time you visit. Welcome to SAVRON.
            </p>
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
