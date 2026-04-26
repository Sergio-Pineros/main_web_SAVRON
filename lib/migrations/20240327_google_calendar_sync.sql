-- =========================================
-- SAVRON Migration: Google Calendar columns
-- Run in Supabase SQL Editor (safe to re-run)
-- =========================================

-- 1. Add google_event_id to bookings (stores the event ID for future cancel / update)
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- 2. Add google_calendar_id & google_calendar_tokens to barbers (if not already present)
ALTER TABLE barbers
    ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
    ADD COLUMN IF NOT EXISTS google_calendar_tokens JSONB,
    ADD COLUMN IF NOT EXISTS google_sync_token TEXT,
    ADD COLUMN IF NOT EXISTS google_channel_id TEXT,
    ADD COLUMN IF NOT EXISTS google_resource_id TEXT;
