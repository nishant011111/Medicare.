-- MediCore Phase 10 Non-Destructive Additive Migration
-- Adds MedicationDoseStatus enum, medication_reminders table, and medication_dose_logs table
-- with strict foreign key links to patients, prescriptions, and prescription_items,
-- plus composite unique constraint preventing duplicate dose logs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MedicationDoseStatus') THEN
    CREATE TYPE "MedicationDoseStatus" AS ENUM ('TAKEN', 'SKIPPED', 'SNOOZED', 'NOT_RECORDED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "medication_reminders" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "prescription_id" UUID NOT NULL,
  "prescription_item_id" UUID NOT NULL,
  "label" TEXT,
  "schedule_type" TEXT NOT NULL DEFAULT 'DAILY',
  "days_of_week" INTEGER[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
  "reminder_times" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "start_date" TEXT NOT NULL,
  "end_date" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "personal_notes" TEXT,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "medication_reminders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medication_reminders_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medication_reminders_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medication_reminders_prescription_item_id_fkey"
    FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "medication_reminders_patient_id_is_enabled_is_deleted_idx"
  ON "medication_reminders" ("patient_id", "is_enabled", "is_deleted");

CREATE INDEX IF NOT EXISTS "medication_reminders_patient_id_prescription_item_id_idx"
  ON "medication_reminders" ("patient_id", "prescription_item_id");

CREATE TABLE IF NOT EXISTS "medication_dose_logs" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "prescription_id" UUID NOT NULL,
  "prescription_item_id" UUID NOT NULL,
  "reminder_id" UUID,
  "scheduled_date" TEXT NOT NULL,
  "scheduled_time" TEXT NOT NULL,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "status" "MedicationDoseStatus" NOT NULL,
  "action_at" TIMESTAMP(3),
  "snoozed_until" TIMESTAMP(3),
  "notes" TEXT,
  "previous_status" "MedicationDoseStatus",
  "correction_reason" TEXT,
  "corrected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "medication_dose_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medication_dose_logs_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medication_dose_logs_prescription_id_fkey"
    FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medication_dose_logs_prescription_item_id_fkey"
    FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medication_dose_logs_reminder_id_fkey"
    FOREIGN KEY ("reminder_id") REFERENCES "medication_reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_dose_logs_patient_id_prescription_item_id_scheduled_date_scheduled_time_key"
  ON "medication_dose_logs" ("patient_id", "prescription_item_id", "scheduled_date", "scheduled_time");

CREATE INDEX IF NOT EXISTS "medication_dose_logs_patient_id_scheduled_date_idx"
  ON "medication_dose_logs" ("patient_id", "scheduled_date");

CREATE INDEX IF NOT EXISTS "medication_dose_logs_patient_id_prescription_item_id_scheduled_date_idx"
  ON "medication_dose_logs" ("patient_id", "prescription_item_id", "scheduled_date");
