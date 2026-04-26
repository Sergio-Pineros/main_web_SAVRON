-- Migration: Add CRM and Stripe columns
-- Run this in your Supabase SQL Editor

-- Add payment tracking to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Add last_booking_date to clients for fast CRM filtering
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_booking_date DATE;

-- Backfill last_booking_date from existing bookings
UPDATE clients SET last_booking_date = (
    SELECT MAX(date) FROM bookings
    WHERE bookings.client_email = clients.email
    AND bookings.status IN ('confirmed', 'completed')
)
WHERE EXISTS (
    SELECT 1 FROM bookings WHERE bookings.client_email = clients.email
);
