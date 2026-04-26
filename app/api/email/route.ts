// POST /api/email
// Sends a booking confirmation email via Resend.
// Sends calendar invite to client, barber, and barbershop (info@savronmn.com)
// Body: { bookingId: string }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const BARBERSHOP_EMAIL = 'info@savronmn.com';

function getIcsString(booking: any, barberName: string, barberEmail: string | null): string {
    const [timePart, meridiem] = (booking.time || '12:00 PM').split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    
    // Fallback if Date is missing
    const dateStr = booking.date || new Date().toISOString().split('T')[0];
    
    const durationMatch = booking.duration ? booking.duration.match(/\d+/) : null;
    const durationMin = durationMatch ? parseInt(durationMatch[0]) : 45;
    
    const startMs = new Date(`${dateStr}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00-05:00`).getTime();
    const endMs = startMs + durationMin * 60000;
    
    const startUtc = new Date(startMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endUtc = new Date(endMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Build attendee lines
    const attendees: string[] = [];
    if (booking.client_email) {
        attendees.push(`ATTENDEE;CN=${booking.client_name || 'Client'};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${booking.client_email}`);
    }
    if (barberEmail) {
        attendees.push(`ATTENDEE;CN=${barberName};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${barberEmail}`);
    }
    attendees.push(`ATTENDEE;CN=SAVRON Barbershop;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${BARBERSHOP_EMAIL}`);

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SAVRON Barbershop & Lounge//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `DTSTAMP:${nowUtc}`,
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        `SUMMARY:${booking.service} with ${barberName}`,
        `LOCATION:SAVRON Barbershop & Lounge, Minneapolis MN`,
        `DESCRIPTION:Your appointment for ${booking.service} with ${barberName}.`,
        `ORGANIZER;CN=SAVRON Barbershop:mailto:${BARBERSHOP_EMAIL}`,
        ...attendees,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { bookingId } = await request.json() as { bookingId: string };

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, barbers(name, email)')
    .eq('id', bookingId)
    .single();

  if (!booking || !booking.client_email) {
    return NextResponse.json({ skipped: true, reason: 'no_email' });
  }

  const barber = booking.barbers as { name: string; email: string | null } | null;
  const barberName = barber?.name ?? booking.barber_name ?? 'Your barber';
  const barberEmail = barber?.email ?? null;

  const dateFormatted = (() => {
    try { return format(new Date(booking.date), 'EEEE, MMMM d, yyyy'); }
    catch { return booking.date; }
  })();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#121212;border:1px solid rgba(255,255,255,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0D3B4F;padding:28px 32px;text-align:center;">
            <img src="https://savronmn.com/logo.png" alt="SAVRON" width="160" style="display:block;margin:0 auto 8px;max-width:160px;height:auto;" />
            <p style="margin:0;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:3px;text-transform:uppercase;">Barbershop &amp; Lounge · Minneapolis</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Booking Confirmed</p>
            <h1 style="margin:0 0 28px;color:#fff;font-size:26px;letter-spacing:2px;text-transform:uppercase;">You're all set, ${booking.client_name?.split(' ')[0] ?? 'friend'}.</h1>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid rgba(255,255,255,0.08);margin-bottom:28px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Service</span><br>
                  <span style="color:#fff;font-size:15px;">${booking.service}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Barber</span><br>
                  <span style="color:#fff;font-size:15px;">${barberName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Date</span><br>
                  <span style="color:#fff;font-size:15px;">${dateFormatted}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Time</span><br>
                  <span style="color:#fff;font-size:15px;">${booking.time}</span>
                </td>
              </tr>
              ${booking.price ? `
              <tr>
                <td style="padding:14px 20px;">
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Total</span><br>
                  <span style="color:#1A6A8A;font-size:18px;font-weight:700;">${booking.price}</span>
                </td>
              </tr>` : ''}
            </table>

            <p style="margin:0 0 6px;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
              Need to cancel or reschedule? Reply to this email or call us at <a href="tel:+16125550100" style="color:#1A6A8A;">612-555-0100</a>.
            </p>
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
              We'll see you soon. 💈
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;letter-spacing:1px;">
              SAVRON Barbershop &amp; Lounge · Minneapolis, MN · <a href="https://savronmn.com" style="color:rgba(255,255,255,0.3);">savronmn.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Generate ICS attachment
  const icsString = getIcsString(booking, barberName, barberEmail);
  
  const icsAttachment = {
      filename: 'appointment.ics',
      content: Buffer.from(icsString).toString('base64'),
  };

  // Build all email recipients: client, barber (if email exists), and barbershop
  const emailPromises: Promise<Response>[] = [];
  
  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1. Send to client
  emailPromises.push(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: 'SAVRON Barbershop & Lounge <bookings@savronmn.com>',
        to: [booking.client_email],
        subject: `Your appointment is confirmed — ${booking.time}, ${dateFormatted}`,
        html: htmlBody,
        attachments: [icsAttachment],
      }),
    })
  );

  // 2. Send to barber (if email exists)
  if (barberEmail) {
    const barberHtml = htmlBody
      .replace("You're all set,", `New booking — `)
      .replace(booking.client_name?.split(' ')[0] ?? 'friend', booking.client_name || 'Walk-in');

    emailPromises.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: 'SAVRON Barbershop & Lounge <bookings@savronmn.com>',
          to: [barberEmail],
          subject: `New booking: ${booking.client_name || 'Walk-in'} — ${booking.time}, ${dateFormatted}`,
          html: barberHtml,
          attachments: [icsAttachment],
        }),
      })
    );
  }

  // 3. Send to barbershop / receptionist
  const shopHtml = htmlBody
    .replace("You're all set,", `New booking — `)
    .replace(booking.client_name?.split(' ')[0] ?? 'friend', `${booking.client_name || 'Walk-in'} with ${barberName}`);

  emailPromises.push(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: 'SAVRON Barbershop & Lounge <bookings@savronmn.com>',
        to: [BARBERSHOP_EMAIL],
        subject: `New booking: ${booking.client_name || 'Walk-in'} — ${barberName}, ${booking.time}, ${dateFormatted}`,
        html: shopHtml,
        attachments: [icsAttachment],
      }),
    })
  );

  // Send all emails in parallel
  const results = await Promise.allSettled(emailPromises);
  
  // Check at least the client email succeeded
  const clientResult = results[0];
  if (clientResult.status === 'rejected' || (clientResult.status === 'fulfilled' && !clientResult.value.ok)) {
    const err = clientResult.status === 'fulfilled' ? await clientResult.value.text() : clientResult.reason;
    console.error('Client email failed:', err);
    return NextResponse.json({ error: 'Email failed', detail: String(err) }, { status: 500 });
  }

  // Log any barber/shop failures but don't fail the response
  results.slice(1).forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`Email ${i + 2} failed:`, r.reason);
    }
  });

  return NextResponse.json({ success: true });
}
