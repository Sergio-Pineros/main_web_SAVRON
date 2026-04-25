// POST /api/stripe/checkout
// Creates a Stripe Checkout session for a booking
// Body: { bookingId: string, mode?: 'redirect' | 'link' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    const { bookingId, mode = 'redirect' } = await request.json() as {
        bookingId: string;
        mode?: 'redirect' | 'link';
    };

    if (!bookingId) {
        return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();
    const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Parse price from "$55" format
    const priceStr = (booking.price || '$0').replace(/[^0-9.]/g, '');
    const amountCents = Math.round(parseFloat(priceStr) * 100) || 0;

    if (amountCents <= 0) {
        return NextResponse.json({ error: 'Invalid booking price' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${booking.service} with ${booking.barber_name || 'SAVRON'}`,
                    description: `${booking.date} at ${booking.time}`,
                },
                unit_amount: amountCents,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/admin/bookings?paid=${bookingId}`,
        cancel_url: `${origin}/admin/bookings`,
        metadata: { bookingId },
        customer_email: booking.client_email || undefined,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store stripe session ID
    await supabaseAdmin.from('bookings').update({
        stripe_session_id: session.id,
    }).eq('id', bookingId);

    if (mode === 'link') {
        // Send payment link to client email
        if (booking.client_email) {
            await fetch(`${origin}/api/email/payment-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: booking.client_email,
                    clientName: booking.client_name,
                    service: booking.service,
                    amount: booking.price,
                    paymentUrl: session.url,
                }),
            }).catch(() => {}); // fire-and-forget
        }
        return NextResponse.json({ success: true, url: session.url, sent: !!booking.client_email });
    }

    return NextResponse.json({ url: session.url });
}
