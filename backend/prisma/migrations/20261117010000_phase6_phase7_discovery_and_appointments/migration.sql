-- MediCore Phase 6 & Phase 7 Non-Destructive Additive Migration
-- Adds optional hospital/doctor discovery metadata and a database-level partial unique index
-- preventing double-booking of active appointment slots even under concurrent transactions.

ALTER TABLE "hospitals"
  ADD COLUMN IF NOT EXISTS "about" TEXT,
  ADD COLUMN IF NOT EXISTS "operating_hours" TEXT,
  ADD COLUMN IF NOT EXISTS "cancellation_policy_hours" INTEGER;

ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "profile_photo_url" TEXT;

-- Partial unique index: prevents two active bookings for the same doctor, date, and start time
-- while releasing the slot automatically when an appointment is CANCELLED or NO_SHOW.
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_active_slot_unique_idx"
  ON "appointments" ("doctor_id", "appointment_date", "slot_start_time")
  WHERE "status" NOT IN ('CANCELLED', 'NO_SHOW');
