// POST /api/stripe/client-charge
// Creates a Stripe Checkout session for a direct client charge (not tied to a booking)
// Body: { clientId: string, amount: number (dollars), description: string, mode: 'redirect' | 'link' }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion });

const getAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    const { clientId, amount, description, mode = 'redirect' } = await request.json() as {
        clientId: string;
        amount: number;
        description: string;
        mode?: 'redirect' | 'link';
    };

    if (!clientId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();
    const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name, email')
        .eq('id', clientId)
        .single();

    if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const amountCents = Math.round(amount * 100);
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: description || 'SAVRON Barbershop & Lounge',
                    description: `Client: ${client.name}`,
                },
                unit_amount: amountCents,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/admin/clients?paid=1`,
        cancel_url: `${origin}/admin/clients`,
        customer_email: client.email || undefined,
        metadata: { clientId, type: 'client_charge' },
    });

    if (mode === 'link' && client.email) {
        // Fire-and-forget payment link email
        fetch(`${origin}/api/email/payment-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: client.email,
                clientName: client.name,
                service: description,
                amount: `$${amount.toFixed(2)}`,
                paymentUrl: session.url,
            }),
        }).catch(() => {});
        return NextResponse.json({ success: true, url: session.url, sent: true });
    }

    return NextResponse.json({ url: session.url, sent: false });
}
