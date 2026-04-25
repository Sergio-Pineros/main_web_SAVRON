import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');
const CLASS_ID = process.env.GOOGLE_WALLET_CLASS_ID;

export async function POST(req: NextRequest) {
    try {
        // 1. Authentication (Header check)
        const apiKey = req.headers.get('x-api-key');
        const expectedKey = process.env.API_SECRET_KEY || process.env.NEXT_PUBLIC_API_SECRET_KEY || "development_fallback_key";
        if (apiKey !== expectedKey) {
            console.warn('Unauthorized access attempt to Google Wallet API');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { name, email } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'Missing required fields: name, email' }, { status: 400 });
        }

        // 3. Check Credentials
        if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !CLASS_ID) {
            console.error('Missing environment variables for Google Wallet configuration');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // 4. Construct Google Wallet Pass Object
        // This follows the "Generic" pass type structure
        const passObject = {
            id: `${ISSUER_ID}.${uuidv4()}`,
            classId: CLASS_ID,
            genericType: 'GENERIC_TYPE_UNSPECIFIED',
            hexBackgroundColor: '#0A0A0A',
            logo: {
                sourceUri: {
                    uri: process.env.GOOGLE_WALLET_LOGO_URL || 'https://storage.googleapis.com/wallet-ux-resources/pass-types/generic/logo.png' // Needs to be a public HTTPS URL
                }
            },
            cardTitle: {
                defaultValue: {
                    language: 'en-US',
                    value: 'SERGIO PIÑEROS'
                }
            },
            header: {
                defaultValue: {
                    language: 'en-US',
                    value: 'SAVRON MEMBER'
                }
            },
            primaryFields: [
                {
                    id: 'name',
                    label: 'NAME',
                    value: name
                }
            ],
            secondaryFields: [
                {
                    id: 'email',
                    label: 'EMAIL',
                    value: email
                }
            ],
            barcode: {
                type: 'QR_CODE',
                value: email
            }
        };

        // 5. Generate Signed JWT
        const jwtPayload = {
            iss: SERVICE_ACCOUNT_EMAIL,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            payload: {
                genericObjects: [passObject]
            }
        };

        // Sign the JWT
        const token = jwt.sign(jwtPayload, PRIVATE_KEY, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return NextResponse.json({
            success: true,
            saveUrl: saveUrl
        });

    } catch (error) {
        console.error('Google Wallet generation failed:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
