
import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Environment variables
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const WALLET_WWDR_CERT = process.env.WALLET_WWDR_CERT;
const PASSPHRASE = process.env.WALLET_PASSPHRASE; // Optional
const PASS_TYPE_ID = process.env.PASS_TYPE_ID; // e.g., pass.com.example.wallet
const TEAM_ID = process.env.TEAM_ID; // Your Apple Team ID

export async function POST(req: NextRequest) {
    try {
        // 1. Authentication
        const apiKey = req.headers.get('x-api-key');
        const expectedKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_SECRET_KEY || "development_fallback_key";
        if (apiKey !== expectedKey) {
            console.warn('Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { name, email } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Missing required fields: name, email' }, { status: 400 });
        }

        // 3. Load Certificates
        if (!WALLET_PRIVATE_KEY || !WALLET_WWDR_CERT || !PASS_TYPE_ID || !TEAM_ID) {
            console.error('Missing environment variables for Wallet configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Convert base64 encoded certs
        let signerKey: Buffer;
        let wwdrCert: Buffer;
        try {
            signerKey = Buffer.from(WALLET_PRIVATE_KEY, 'base64');
            wwdrCert = Buffer.from(WALLET_WWDR_CERT, 'base64');
        } catch (e) {
            console.error('Failed to decode certificates', e);
            return NextResponse.json({ error: 'Certificate configuration error' }, { status: 500 });
        }

        // 4. Load Images
        const buffers: Record<string, Buffer> = {};
        try {
            const logoPath = path.join(process.cwd(), 'public', 'logo.png');
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                buffers['logo.png'] = logoBuffer;
                buffers['icon.png'] = logoBuffer; // icon.png is mandatory for passes
            }
        } catch (e) {
            console.warn('Could not read logo image:', e);
        }

        // 5. Create Pass
        // We assume 'passkit-generator' v3+ usage. 
        const pass = new PKPass(
            buffers,
            {
                wwdr: wwdrCert,
                signerCert: signerKey, // Using the same buffer assuming it's a combined PEM
                signerKey: signerKey,
                signerKeyPassphrase: PASSPHRASE
            },
            {
                description: 'Sergio Piñeros Studio Membership',
                organizationName: 'Sergio Piñeros Studio',
                passTypeIdentifier: PASS_TYPE_ID,
                teamIdentifier: TEAM_ID,
                serialNumber: uuidv4(),
                backgroundColor: 'rgb(10, 10, 10)', // #0A0A0A
                labelColor: 'rgb(136, 136, 136)', // #888888
                foregroundColor: 'rgb(255, 255, 255)', // #FFFFFF
                logoText: 'SAVRON', // Optional
                userInfo: { email }
            }
        );

        // Set the specific pass type structure (Store Card)
        pass.type = 'storeCard';

        // 5. Add Fields
        pass.primaryFields.push({
            key: 'tier',
            label: 'MEMBER',
            value: 'SAVRON MEMBER',
        });

        pass.secondaryFields.push({
            key: 'name',
            label: 'NAME',
            value: name,
        });

        pass.auxiliaryFields.push({
            key: 'email',
            label: 'EMAIL',
            value: email,
            textAlignment: 'PKTextAlignmentRight'
        });

        // 7. Handle Add Fields (moved earlier, but kept here for logical order)
        console.log(`Generating pass for ${name} (${email})...`);

        // 7. Generate Buffer
        const buffer = await pass.getAsBuffer();

        // 8. Return Response
        return new NextResponse(buffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.apple.pkpass',
                'Content-Disposition': `attachment; filename=${name.replace(/\s+/g, '_')}_pass.pkpass`,
            },
        });

    } catch (error) {
        console.error('Pass generation failed:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
