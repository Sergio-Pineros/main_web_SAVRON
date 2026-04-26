// Client-side helper — fires email + calendar sync after a booking is inserted.
// Called from BookingFlow and AsapBookingFlow after supabase.insert() succeeds.

export async function triggerPostBooking(bookingId: string): Promise<void> {
    await Promise.allSettled([
        fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId }),
        }),
        fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, action: 'create' }),
        }),
    ]);
    // allSettled — failures are silent so booking is never blocked
}
