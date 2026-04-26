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

    const client = await auth.getClient();
    const passObject = {
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

    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@savronmn.com',
        to: email,
        subject: `SAVRON — Updated Membership Pass (${visitCount} visit${visitCount === 1 ? '' : 's'})`,
        html: `<div style="background:#141412;color:#e8e4dc;font-family:Helvetica,Arial,sans-serif;padding:48px 32px;max-width:540px;margin:0 auto;">
<p style="font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(232,228,220,0.3);margin:0 0 32px;">SAVRON &mdash; Pass Updated</p>
<h1 style="font-family:Georgia,serif;font-size:42px;font-weight:400;color:#e8e4dc;margin:0 0 24px;">${firstName}, your pass has been updated.</h1>
<p style="font-size:14px;font-weight:300;line-height:1.8;color:rgba(232,228,220,0.5);margin:0 0 32px;">Your SAVRON pass now reflects <strong style="color:rgba(232,228,220,0.75);">${visitCount} visit${visitCount === 1 ? '' : 's'}</strong>. Open the attachment below to update Apple Wallet.</p>
<p style="font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(232,228,220,0.2);margin:0;">North Loop &middot; Minneapolis</p>
</div>`,
        attachments: [{
            filename: `${name.replace(/\s+/g, '_')}_savron_pass.pkpass`,
            content: passBuffer,
        }],
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
