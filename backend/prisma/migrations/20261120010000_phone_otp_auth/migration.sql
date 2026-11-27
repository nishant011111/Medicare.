-- Migration: Phone Number & OTP Authentication System
ALTER TABLE "users"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "password_hash" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_phone_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "phone_otps" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "phone" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'LOGIN',
  "otp_hash" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "phone_otps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "phone_otps_otp_hash_key" ON "phone_otps"("otp_hash");
CREATE INDEX IF NOT EXISTS "phone_otps_phone_purpose_idx" ON "phone_otps"("phone", "purpose");
CREATE INDEX IF NOT EXISTS "phone_otps_user_id_idx" ON "phone_otps"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'phone_otps_user_id_fkey'
  ) THEN
    ALTER TABLE "phone_otps"
      ADD CONSTRAINT "phone_otps_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
