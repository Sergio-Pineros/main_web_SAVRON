-- SAVRON v3 Migration — Run AFTER migration_v2.sql
-- Adds Google Calendar token storage + event tracking to bookings

-- Store OAuth tokens per barber (encrypted at rest by Supabase)
ALTER TABLE barbers
    ADD COLUMN IF NOT EXISTS google_calendar_tokens JSONB;

-- Track Google Calendar event ID per booking (for updates + deletes)
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS google_event_id TEXT;
