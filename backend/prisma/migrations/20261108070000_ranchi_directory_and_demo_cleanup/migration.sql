-- MediCore Ranchi Hospital Directory Schema Extension & Controlled Demo Data Cleanup

DO $$ BEGIN
  CREATE TYPE "DirectoryVerificationStatus" AS ENUM ('PENDING_VERIFICATION', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "hospitals"
  ADD COLUMN IF NOT EXISTS "directory_code" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "legal_name" TEXT,
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "facility_type" TEXT,
  ADD COLUMN IF NOT EXISTS "ownership_type" TEXT,
  ADD COLUMN IF NOT EXISTS "pincode" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "secondary_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_available" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "verification_status" "DirectoryVerificationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  ADD COLUMN IF NOT EXISTS "source_name" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "last_verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_active_tenant" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "hospitals_verification_status_idx" ON "hospitals"("verification_status");
CREATE INDEX IF NOT EXISTS "hospitals_city_pincode_idx" ON "hospitals"("city", "pincode");
CREATE INDEX IF NOT EXISTS "hospitals_facility_type_ownership_type_idx" ON "hospitals"("facility_type", "ownership_type");

CREATE TABLE IF NOT EXISTS "hospital_contacts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "contact_type" TEXT NOT NULL,
  "contact_value" TEXT NOT NULL,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "hospital_contacts_hospital_id_idx" ON "hospital_contacts"("hospital_id");

CREATE TABLE IF NOT EXISTS "hospital_specialties" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "specialty_name" TEXT NOT NULL,
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("hospital_id", "specialty_name")
);

CREATE INDEX IF NOT EXISTS "hospital_specialties_specialty_name_idx" ON "hospital_specialties"("specialty_name");

CREATE TABLE IF NOT EXISTS "hospital_sources" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "source_name" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "data_status_note" TEXT,
  "raw_payload_json" JSONB,
  "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "hospital_sources_hospital_id_idx" ON "hospital_sources"("hospital_id");

-- Controlled Cleanup of Fictional Demo Seed Records
DELETE FROM "hospitals"
WHERE "id" IN (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);
