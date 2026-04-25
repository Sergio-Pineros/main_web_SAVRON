// POST /api/stripe/webhook
// Handles Stripe webhook events — marks bookings as paid

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event: Stripe.Event;

    // If we have a webhook secret, verify signature. Otherwise accept raw.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
        try {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        } catch (err) {
            console.error('Stripe webhook signature failed:', err);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
    } else {
        event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            await supabaseAdmin.from('bookings').update({
                payment_status: 'paid',
                stripe_session_id: session.id,
            }).eq('id', bookingId);

            console.log(`[Stripe] Booking ${bookingId} marked as paid`);
        }
    }

    return NextResponse.json({ received: true });
}
