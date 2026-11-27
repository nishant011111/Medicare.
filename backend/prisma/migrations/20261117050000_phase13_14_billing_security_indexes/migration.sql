-- Phase 13 & Phase 14 Additive Migration: Patient Billing, Verified Payment Receipts, and Performance Indexes
-- Note: Safe additive migration preserving all existing clinical & patient data.

ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'SUCCESS';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentRecordStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "invoice_date" TEXT,
  ADD COLUMN IF NOT EXISTS "due_date" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "payments"
  ALTER COLUMN "receipt_number" DROP NOT NULL,
  ALTER COLUMN "collected_by_user_id" DROP NOT NULL,
  ALTER COLUMN "paid_at" DROP NOT NULL,
  ALTER COLUMN "paid_at" DROP DEFAULT,
  ALTER COLUMN "status" SET DEFAULT 'CREATED',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "method_detail" TEXT,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receipt_number" TEXT NOT NULL,
  "payment_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "hospital_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipts_receipt_number_key" ON "payment_receipts"("receipt_number");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipts_payment_id_key" ON "payment_receipts"("payment_id");
CREATE INDEX IF NOT EXISTS "payment_receipts_patient_id_issued_at_idx" ON "payment_receipts"("patient_id", "issued_at");
CREATE INDEX IF NOT EXISTS "payment_receipts_hospital_id_invoice_id_idx" ON "payment_receipts"("hospital_id", "invoice_id");

DO $$ BEGIN
  ALTER TABLE "payment_receipts"
    ADD CONSTRAINT "payment_receipts_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_receipts"
    ADD CONSTRAINT "payment_receipts_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "invoices_patient_id_status_created_at_idx" ON "invoices"("patient_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "invoices_hospital_id_patient_id_idx" ON "invoices"("hospital_id", "patient_id");
CREATE INDEX IF NOT EXISTS "payments_patient_id_paid_at_idx" ON "payments"("patient_id", "paid_at");
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "payments"("status", "created_at");
