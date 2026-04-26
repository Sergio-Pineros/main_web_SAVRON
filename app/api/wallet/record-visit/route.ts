import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';
import { PKPass } from 'passkit-generator';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

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

async function updateGoogleWalletPass(
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

    const logoUrl = process.env.GOOGLE_WALLET_LOGO_URL || 'https://savronmn.com/logo.png';
    const client = await auth.getClient();
    const passObject = {
        id: objectId,
        classId: CLASS_ID,
        state: 'ACTIVE',
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: '#0D3B4F',
        logo: {
            sourceUri: { uri: logoUrl },
            contentDescription: { defaultValue: { language: 'en-US', value: 'SAVRON Logo' } },
        },
        cardTitle: { defaultValue: { language: 'en-US', value: 'SAVRON' } },
        header: { defaultValue: { language: 'en-US', value: name } },
        subheader: { defaultValue: { language: 'en-US', value: 'MEMBER' } },
        textModulesData: [
            { id: 'visits', header: 'VISITS', body: visitCount.toString() },
            { id: 'email', header: 'EMAIL', body: email },
        ],
        barcode: { type: 'QR_CODE', value: email },
    };

    await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${encodeURIComponent(objectId)}`,
        method: 'PUT',
        data: passObject,
    });
}

async function resendApplePass(
    serialNumber: string,
    name: string,
    email: string,
    visitCount: number
): Promise<void> {
    const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    const WALLET_WWDR_CERT = process.env.WALLET_WWDR_CERT;
    const PASSPHRASE = process.env.WALLET_PASSPHRASE;
    const PASS_TYPE_ID = process.env.PASS_TYPE_ID;
    const TEAM_ID = process.env.TEAM_ID;

    if (!WALLET_PRIVATE_KEY || !WALLET_WWDR_CERT || !PASS_TYPE_ID || !TEAM_ID) return;

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

    const passBuffer = await pass.getAsBuffer() as unknown as Buffer;
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const firstName = name.split(' ')[0];

    // Read logo for inline embedding
    const emailLogoPath = path.join(process.cwd(), 'public', 'logo.png');
    const emailLogoBuffer = fs.existsSync(emailLogoPath) ? fs.readFileSync(emailLogoPath) : null;
    const logoSrc = emailLogoBuffer ? 'cid:savron_logo' : 'https://savronmn.com/logo.png';

    const emailAttachments: Array<{ filename: string; content: Buffer; content_id?: string }> = [];
    if (emailLogoBuffer) {
        emailAttachments.push({ filename: 'logo.png', content: emailLogoBuffer, content_id: 'savron_logo' });
    }
    emailAttachments.push({
        filename: `${name.replace(/\s+/g, '_')}_savron_pass.pkpass`,
        content: passBuffer,
    });

    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@savronmn.com',
        to: email,
        subject: `SAVRON — Updated Membership Pass (${visitCount} visit${visitCount === 1 ? '' : 's'})`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#121212;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0D3B4F;padding:28px 32px;text-align:center;">
            <img src="${logoSrc}" alt="SAVRON" width="160" style="display:block;margin:0 auto 8px;max-width:160px;height:auto;" />
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:3px;text-transform:uppercase;">Barbershop &amp; Lounge · Minneapolis</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Pass Updated</p>
            <h1 style="margin:0 0 28px;color:#fff;font-size:26px;letter-spacing:2px;text-transform:uppercase;">${firstName}, your pass has been updated.</h1>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Total Visits</span><br>
                  <span style="color:#1A6A8A;font-size:18px;font-weight:700;">${visitCount} visit${visitCount === 1 ? '' : 's'}</span>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
              Open the <strong style="color:rgba(255,255,255,0.7);">.pkpass</strong> attachment below to update your Apple Wallet pass.
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
</html>`,
        attachments: emailAttachments,
    });
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await req.json();
        const { subscriber_id, action } = body;

        if (!subscriber_id || !action) {
            return NextResponse.json({ error: 'subscriber_id and action required' }, { status: 400 });
        }

        const { data: subscriber, error: fetchError } = await supabase
            .from('email_subscribers')
            .select('*')
            .eq('id', subscriber_id)
            .single();

        if (fetchError || !subscriber) {
            return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
        }

        if (action === 'record_visit') {
            const newCount = subscriber.visit_count + 1;

            const { error: updateError } = await supabase
                .from('email_subscribers')
                .update({
                    visit_count: newCount,
                    last_visit_at: new Date().toISOString(),
                })
                .eq('id', subscriber_id);

            if (updateError) {
                return NextResponse.json({ error: 'Failed to update visit count' }, { status: 500 });
            }

            // Update Google Wallet pass live on device
            if (subscriber.google_pass_object_id) {
                try {
                    await updateGoogleWalletPass(
                        subscriber.google_pass_object_id,
                        subscriber.name,
                        subscriber.email,
                        newCount
                    );
                } catch (err) {
                    console.error('Google Wallet update failed (non-fatal):', err);
                }
            }

            return NextResponse.json({ success: true, visit_count: newCount });
        }

        if (action === 'remove_visit') {
            const newCount = Math.max(0, subscriber.visit_count - 1);

            const { error: updateError } = await supabase
                .from('email_subscribers')
                .update({
                    visit_count: newCount,
                })
                .eq('id', subscriber_id);

            if (updateError) {
                return NextResponse.json({ error: 'Failed to update visit count' }, { status: 500 });
            }

            // Update Google Wallet pass live on device
            if (subscriber.google_pass_object_id) {
                try {
                    await updateGoogleWalletPass(
                        subscriber.google_pass_object_id,
                        subscriber.name,
                        subscriber.email,
                        newCount
                    );
                } catch (err) {
                    console.error('Google Wallet update failed (non-fatal):', err);
                }
            }

            return NextResponse.json({ success: true, visit_count: newCount });
        }

        if (action === 'send_updated_pass') {
            try {
                await resendApplePass(
                    subscriber.pass_serial_number,
                    subscriber.name,
                    subscriber.email,
                    subscriber.visit_count
                );
            } catch (err) {
                console.error('Apple pass resend failed:', err);
                return NextResponse.json({ error: 'Failed to resend pass' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Updated pass sent to ' + subscriber.email });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        console.error('record-visit route failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
