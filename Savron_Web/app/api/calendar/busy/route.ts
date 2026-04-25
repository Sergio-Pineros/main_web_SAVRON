import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken, getBusySlots, type CalendarToken } from '@/lib/google-calendar';

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const barberId = searchParams.get('barberId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!barberId || !date) {
        return NextResponse.json({ error: 'Missing barberId or date' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    const { data: barber } = await supabaseAdmin
        .from('barbers')
        .select('google_calendar_id, google_calendar_tokens')
        .eq('id', barberId)
        .single();

    if (!barber) {
        return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    const tokens = barber.google_calendar_tokens as CalendarToken | null;
    const calendarId = barber.google_calendar_id;

    if (!tokens || !calendarId) {
        // Barber hasn't connected Google Calendar. Treat as fully available (0 busy slots returns).
        return NextResponse.json({ busy: [] });
    }

    try {
        const accessToken = await getValidAccessToken(tokens);
        
        // Define day boundaries in Central Time (CST)
        // Hardcoding standard 9 AM to 7 PM bounding for efficiency, or just full 24 hrs
        const timeMin = `${date}T00:00:00-05:00`;
        const timeMax = `${date}T23:59:59-05:00`;

        const busySlots = await getBusySlots(accessToken, calendarId, timeMin, timeMax);
        
        return NextResponse.json({ busy: busySlots });
    } catch (err) {
        console.error('Error fetching calendar busy slots:', err);
        return NextResponse.json({ error: 'Failed to fetch busy slots' }, { status: 500 });
    }
}
