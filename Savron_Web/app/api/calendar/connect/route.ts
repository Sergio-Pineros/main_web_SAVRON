// GET /api/calendar/connect?barberId=xxx
// Redirects the barber to Google OAuth with their ID as state param

import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
    const barberId = request.nextUrl.searchParams.get('barberId');
    if (!barberId) {
        return NextResponse.json({ error: 'Missing barberId' }, { status: 400 });
    }
    const authUrl = buildAuthUrl(barberId);
    return NextResponse.redirect(authUrl);
}
