-- MediCore Phase 9: SaaS Product Launch, Hospital Onboarding, Subscriptions, Entitlements, Support & Business Operations

DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('REGISTERED', 'DOCUMENTS_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "monthly_price_paise" INTEGER NOT NULL,
  "annual_price_paise" INTEGER NOT NULL,
  "trial_days" INTEGER NOT NULL DEFAULT 14,
  "max_staff_accounts" INTEGER NOT NULL,
  "max_branches" INTEGER NOT NULL,
  "monthly_ai_token_limit" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL REFERENCES "subscription_plans"("id") ON DELETE CASCADE,
  "feature_code" TEXT NOT NULL,
  "feature_name" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "limit_value" INTEGER,
  UNIQUE("plan_id", "feature_code")
);

CREATE TABLE IF NOT EXISTS "hospital_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL UNIQUE REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "plan_id" UUID NOT NULL REFERENCES "subscription_plans"("id"),
  "plan_code" TEXT NOT NULL,
  "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "trial_ends_at" TIMESTAMP(3),
  "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_end" TIMESTAMP(3) NOT NULL,
  "grace_period_ends_at" TIMESTAMP(3),
  "auto_renew" BOOLEAN NOT NULL DEFAULT true,
  "cancelled_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "hospital_subscriptions_status_current_period_end_idx" ON "hospital_subscriptions"("status", "current_period_end");

CREATE TABLE IF NOT EXISTS "subscription_invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_number" TEXT NOT NULL UNIQUE,
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "subscription_id" UUID NOT NULL REFERENCES "hospital_subscriptions"("id") ON DELETE CASCADE,
  "plan_code" TEXT NOT NULL,
  "billing_cycle" TEXT NOT NULL,
  "subtotal_paise" INTEGER NOT NULL,
  "tax_paise" INTEGER NOT NULL,
  "total_paise" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "period_start" TEXT NOT NULL,
  "period_end" TEXT NOT NULL,
  "due_date" TEXT NOT NULL,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "subscription_invoices_hospital_id_status_idx" ON "subscription_invoices"("hospital_id", "status");

CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "receipt_number" TEXT NOT NULL UNIQUE,
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "subscription_id" UUID NOT NULL REFERENCES "hospital_subscriptions"("id") ON DELETE CASCADE,
  "invoice_id" UUID NOT NULL REFERENCES "subscription_invoices"("id") ON DELETE CASCADE,
  "amount_paise" INTEGER NOT NULL,
  "payment_method" TEXT NOT NULL,
  "gateway_provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
  "gateway_order_id" TEXT NOT NULL,
  "gateway_payment_id" TEXT UNIQUE,
  "gateway_signature" TEXT,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'CAPTURED',
  "failure_reason" TEXT,
  "refunded_paise" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "subscription_payments_hospital_id_status_idx" ON "subscription_payments"("hospital_id", "status");

CREATE TABLE IF NOT EXISTS "subscription_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "subscription_id" UUID NOT NULL REFERENCES "hospital_subscriptions"("id") ON DELETE CASCADE,
  "event_type" TEXT NOT NULL,
  "from_plan_code" TEXT,
  "to_plan_code" TEXT,
  "from_status" TEXT,
  "to_status" TEXT,
  "actor_user_id" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "subscription_events_hospital_id_created_at_idx" ON "subscription_events"("hospital_id", "created_at");

CREATE TABLE IF NOT EXISTS "hospital_branches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "branch_name" TEXT NOT NULL,
  "branch_code" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "contact_phone" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("hospital_id", "branch_code")
);

CREATE TABLE IF NOT EXISTS "hospital_onboardings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL UNIQUE REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "legal_name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "hospital_type" TEXT NOT NULL,
  "registration_number" TEXT NOT NULL UNIQUE,
  "clinical_license_number" TEXT NOT NULL UNIQUE,
  "gstin" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "admin_full_name" TEXT NOT NULL,
  "admin_email" TEXT NOT NULL,
  "admin_phone" TEXT NOT NULL,
  "status" "OnboardingStatus" NOT NULL DEFAULT 'REGISTERED',
  "rejection_reason" TEXT,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "submission_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "hospital_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "onboarding_id" UUID NOT NULL REFERENCES "hospital_onboardings"("id") ON DELETE CASCADE,
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "document_type" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "private_storage_key" TEXT NOT NULL UNIQUE,
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "uploaded_by_user_id" UUID NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_number" TEXT NOT NULL UNIQUE,
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "created_by_user_id" UUID NOT NULL,
  "assigned_to_user_id" UUID,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "resolved_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "support_tickets_hospital_id_status_idx" ON "support_tickets"("hospital_id", "status");

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "hospital_id" UUID NOT NULL,
  "sender_user_id" UUID NOT NULL,
  "sender_role" TEXT NOT NULL,
  "sender_name" TEXT NOT NULL,
  "message_body" TEXT NOT NULL,
  "is_staff_reply" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "support_attachments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "hospital_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL UNIQUE,
  "uploaded_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "feature_entitlements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "feature_code" TEXT NOT NULL,
  "is_entitled" BOOLEAN NOT NULL,
  "limit_value" INTEGER,
  "current_usage" INTEGER NOT NULL DEFAULT 0,
  "source_plan_code" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("hospital_id", "feature_code")
);

CREATE TABLE IF NOT EXISTS "usage_metrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
  "metric_code" TEXT NOT NULL,
  "period_month" TEXT NOT NULL,
  "current_count" INTEGER NOT NULL DEFAULT 0,
  "plan_limit" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("hospital_id", "metric_code", "period_month")
);

CREATE TABLE IF NOT EXISTS "platform_announcements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "target_audience" TEXT NOT NULL DEFAULT 'ALL_HOSPITALS',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "published_by_id" UUID NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3)
);
