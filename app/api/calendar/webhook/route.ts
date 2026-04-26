import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken, getChangedEvents } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');

    if (!channelId) {
        return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    // Google sends a 'sync' state initially when the watch is created
    if (resourceState === 'sync') {
        return NextResponse.json({ received: true });
    }

    // 1. Load Admin Supabase client (bypasses RLS for backend operation)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Find the Barber associated with this specific channel
    const { data: barber } = await supabase
        .from('barbers')
        .select('*')
        .eq('google_channel_id', channelId)
        .single();

    if (!barber || !barber.google_sync_token) {
        console.warn(`Webhook received for unknown or unsynced channel ID: ${channelId}`);
        return NextResponse.json({ error: 'Barber not found or missing sync token' }, { status: 404 });
    }

    try {
        // 3. Fetch changed events since our last syncToken
        const accessToken = await getValidAccessToken(barber.google_calendar_tokens);
        const { events, nextSyncToken } = await getChangedEvents(
            accessToken, 
            barber.google_calendar_id, 
            barber.google_sync_token
        );

        // 4. Process deletions
        let cancelledCount = 0;
        for (const event of events) {
            // Google marks deleted instances as 'cancelled'
            if (event.status === 'cancelled') {
                const { error } = await supabase
                    .from('bookings')
                    .update({ status: 'cancelled' })
                    .eq('google_event_id', event.id);
                
                if (!error) cancelledCount++;
            }
        }

        // 5. Save the new sync token so the next webhook only gets newer delta changes
        await supabase
            .from('barbers')
            .update({ google_sync_token: nextSyncToken })
            .eq('id', barber.id);
        
        return NextResponse.json({ 
            success: true, 
            eventsProcessed: events.length,
            bookingsCancelled: cancelledCount 
        });

    } catch (err: any) {
        console.error('Webhook processing error:', err.message || err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
