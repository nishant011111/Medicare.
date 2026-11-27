-- MediCore Phase 3 & Phase 4 Non-Destructive Additive Migration
-- Extends RefreshToken, EmailVerification, PasswordReset, and Patient models,
-- and introduces normalized PatientAddress, EmergencyContact, PatientHealthInformation,
-- and PatientProfilePhoto tables.

ALTER TABLE "refresh_tokens"
  ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3);

ALTER TABLE "email_verifications"
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "password_resets"
  ADD COLUMN IF NOT EXISTS "attempt_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "patients"
  ALTER COLUMN "date_of_birth" DROP NOT NULL,
  ALTER COLUMN "gender" DROP NOT NULL,
  ALTER COLUMN "blood_group" DROP NOT NULL,
  ALTER COLUMN "emergency_contact_name" DROP NOT NULL,
  ALTER COLUMN "emergency_contact_phone" DROP NOT NULL,
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "city" DROP NOT NULL,
  ALTER COLUMN "state" DROP NOT NULL;

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "health_consent_granted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "health_consent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "profile_completion_percent" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "patient_addresses" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "house_number" TEXT,
  "street" TEXT NOT NULL,
  "locality" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'India',
  "is_primary" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_addresses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "patient_addresses_patient_id_is_primary_idx" ON "patient_addresses"("patient_id", "is_primary");

CREATE TABLE IF NOT EXISTS "emergency_contacts" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "emergency_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "emergency_contacts_patient_id_idx" ON "emergency_contacts"("patient_id");

CREATE TABLE IF NOT EXISTS "patient_health_information" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "blood_group" TEXT,
  "known_allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "existing_conditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "current_medications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "medical_notes" TEXT,
  "consent_granted" BOOLEAN NOT NULL DEFAULT false,
  "consent_timestamp" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_health_information_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_health_information_patient_id_key" UNIQUE ("patient_id"),
  CONSTRAINT "patient_health_information_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "patient_profile_photos" (
  "id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_profile_photos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "patient_profile_photos_patient_id_key" UNIQUE ("patient_id"),
  CONSTRAINT "patient_profile_photos_storage_key_key" UNIQUE ("storage_key"),
  CONSTRAINT "patient_profile_photos_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
