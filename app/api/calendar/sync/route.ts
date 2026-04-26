// POST /api/calendar/sync
// Called after a booking is confirmed to push the event to the barber's Google Calendar.
// Also called on booking cancellation (action: "delete").
// Body: { bookingId: string, action: "create" | "delete" }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    getValidAccessToken,
    createCalendarEvent,
    deleteCalendarEvent,
    toIsoString,
    type CalendarToken,
} from '@/lib/google-calendar';
import { SERVICES } from '@/lib/services-data';

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    const { bookingId, action } = await request.json() as {
        bookingId: string;
        action: 'create' | 'delete';
    };

    if (!bookingId || !action) {
        return NextResponse.json({ error: 'Missing bookingId or action' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    // Fetch booking + barber info
    const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*, barbers(name, google_calendar_id, google_calendar_tokens)')
        .eq('id', bookingId)
        .single();

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const barber = booking.barbers as {
        name: string;
        google_calendar_id: string | null;
        google_calendar_tokens: CalendarToken | null;
    } | null;

    if (!barber?.google_calendar_tokens || !barber.google_calendar_id) {
        // Barber hasn't connected Google Calendar — skip silently
        return NextResponse.json({ skipped: true, reason: 'no_calendar_connected' });
    }

    const accessToken = await getValidAccessToken(barber.google_calendar_tokens);

    if (action === 'delete') {
        if (!booking.google_event_id) {
            return NextResponse.json({ skipped: true, reason: 'no_event_id' });
        }
        await deleteCalendarEvent(accessToken, barber.google_calendar_id, booking.google_event_id);
        await getAdmin().from('bookings').update({ google_event_id: null }).eq('id', bookingId);
        return NextResponse.json({ success: true });
    }

    // Build event times from booking.date + booking.time + duration
    const service = SERVICES.find(s => s.name === booking.service);
    const durationMin = service?.durationMin ?? 45;

    const startIso = toIsoString(booking.date, booking.time);

    // Calculate end time
    const [timePart, meridiem] = booking.time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const endMinutes = hours * 60 + minutes + durationMin;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const endMeridiem = endH >= 12 ? 'PM' : 'AM';
    const endH12 = endH > 12 ? endH - 12 : endH || 12;
    const endTimeStr = `${endH12}:${String(endM).padStart(2, '0')} ${endMeridiem}`;
    const endIso = toIsoString(booking.date, endTimeStr);

    const summary = `✂️ ${booking.client_name ?? 'Client'} — ${booking.service}`;
    const description = [
        `Service: ${booking.service}`,
        `Duration: ${durationMin} min`,
        booking.client_phone ? `Phone: ${booking.client_phone}` : '',
        booking.client_email ? `Email: ${booking.client_email}` : '',
        `Price: ${booking.price ?? ''}`,
    ].filter(Boolean).join('\n');

    const eventId = await createCalendarEvent(accessToken, barber.google_calendar_id, {
        summary,
        description,
        startIso,
        endIso,
        attendeeEmail: booking.client_email ?? undefined,
    });

    // Store the Google event ID in the booking for future updates/deletes
    await getAdmin().from('bookings').update({ google_event_id: eventId }).eq('id', bookingId);

    return NextResponse.json({ success: true, eventId });
}
