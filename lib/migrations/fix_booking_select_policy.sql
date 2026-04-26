-- Fix: Allow public SELECT on bookings so .insert().select('id') works
-- Without this, the booking insert succeeds but the returned ID is null,
-- which means the email and calendar sync never fire.
--
-- Run this in your Supabase SQL Editor.

-- Drop the old recursive admin policy on user_roles if it still exists
DROP POLICY IF EXISTS "Admin full access on user_roles" ON user_roles;

-- Add a public SELECT policy on bookings (allows reading back the inserted row)
CREATE POLICY "Public can read bookings" ON bookings
    FOR SELECT USING (TRUE);
