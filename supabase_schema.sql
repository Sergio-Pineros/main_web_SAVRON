-- ============================================================
-- SAVRON — Full database schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. EMAIL SUBSCRIBERS (for membership passes)
-- This is the table causing the "Failed to save subscriber" error
CREATE TABLE IF NOT EXISTS email_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    pass_serial_number TEXT NOT NULL,
    google_pass_object_id TEXT,
    visit_count INTEGER NOT NULL DEFAULT 0,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_visit_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- RLS: Allow service_role full access (API routes use service_role key)
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Service role full access on email_subscribers"
    ON email_subscribers FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- Allow authenticated users (admin) to read
CREATE POLICY IF NOT EXISTS "Authenticated read email_subscribers"
    ON email_subscribers FOR SELECT
    TO authenticated
    USING (TRUE);


-- 2. BARBERS
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'barber',
    bio TEXT,
    specialties TEXT[],
    image_url TEXT,
    phone TEXT,
    email TEXT,
    instagram_url TEXT,
    google_calendar_id TEXT,
    google_calendar_tokens JSONB,
    google_sync_token TEXT,
    google_channel_id TEXT,
    google_resource_id TEXT,
    working_hours JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read barbers"
    ON barbers FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "Authenticated manage barbers"
    ON barbers FOR ALL TO authenticated
    USING (TRUE) WITH CHECK (TRUE);


-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    preferences TEXT,
    membership_status TEXT NOT NULL DEFAULT 'standard',
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_booking_date TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated manage clients"
    ON clients FOR ALL TO authenticated
    USING (TRUE) WITH CHECK (TRUE);


-- 4. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    service TEXT NOT NULL,
    barber_id UUID REFERENCES barbers(id),
    barber_name TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration TEXT,
    price TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    payment_status TEXT,
    notes TEXT,
    google_event_id TEXT,
    stripe_session_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated manage bookings"
    ON bookings FOR ALL TO authenticated
    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY IF NOT EXISTS "Public insert bookings"
    ON bookings FOR INSERT
    WITH CHECK (TRUE);


-- 5. USER ROLES (for admin/barber auth)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'client',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated read user_roles"
    ON user_roles FOR SELECT TO authenticated
    USING (TRUE);


-- 6. APPLICANTS (careers portal)
CREATE TABLE IF NOT EXISTS applicants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    ig_handle TEXT,
    experience TEXT NOT NULL,
    license_status TEXT NOT NULL,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public insert applicants"
    ON applicants FOR INSERT WITH CHECK (TRUE);
CREATE POLICY IF NOT EXISTS "Authenticated manage applicants"
    ON applicants FOR ALL TO authenticated
    USING (TRUE) WITH CHECK (TRUE);


-- ============================================================
-- DONE! All tables created. The "Failed to save subscriber"
-- error should be resolved after running this script.
-- ============================================================
