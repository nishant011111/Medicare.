-- MediCore Phase 6 PostgreSQL Migration: Service Billing, Payments, Insurance/TPA, Expenses & Immutable Financial Ledger
-- All monetary columns use exact integer minor currency units (Paise: 1 INR = 100 Paise)

CREATE TABLE IF NOT EXISTS "service_catalogue" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "service_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "unit_price_paise" INTEGER NOT NULL,
    "tax_rate_percent" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "service_code")
);

CREATE TABLE IF NOT EXISTS "tax_rates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "rate_percent" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
    "encounter_id" UUID,
    "admission_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "tax_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "credit_note_paise" INTEGER NOT NULL DEFAULT 0,
    "paid_paise" INTEGER NOT NULL DEFAULT 0,
    "insurance_settled_paise" INTEGER NOT NULL DEFAULT 0,
    "balance_due_paise" INTEGER NOT NULL,
    "finalized_by_user_id" UUID,
    "finalized_at" TIMESTAMP(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "invoice_number")
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "service_category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "tax_rate_percent" INTEGER NOT NULL DEFAULT 0,
    "tax_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "line_total_paise" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoice_adjustments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "adjustment_type" TEXT NOT NULL,
    "amount_delta_paise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "authorized_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "credit_note_number" TEXT UNIQUE NOT NULL,
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "issued_by_user_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "receipt_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "amount_paise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CAPTURED',
    "gateway_provider" TEXT,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT UNIQUE,
    "gateway_signature" TEXT,
    "idempotency_key" TEXT UNIQUE NOT NULL,
    "collected_by_user_id" UUID NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_allocations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "allocated_paise" INTEGER NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_gateway_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" TEXT UNIQUE NOT NULL,
    "gateway_provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "event_type" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "payload_json" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "refunds" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "refund_number" TEXT UNIQUE NOT NULL,
    "payment_id" UUID NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
    "invoice_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requested_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "reconciliation_records" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "reconciliation_date" TEXT NOT NULL,
    "expected_cash_paise" INTEGER NOT NULL,
    "counted_cash_paise" INTEGER NOT NULL,
    "gateway_settled_paise" INTEGER NOT NULL,
    "discrepancy_paise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BALANCED',
    "reconciled_by_user_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "insurance_providers" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tpa_code" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "patient_policies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL REFERENCES "insurance_providers"("id") ON DELETE CASCADE,
    "policy_number" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "coverage_limit_paise" INTEGER NOT NULL,
    "valid_from" TEXT NOT NULL,
    "valid_until" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pre_authorizations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "pre_auth_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "requested_amount_paise" INTEGER NOT NULL,
    "approved_amount_paise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "clinical_justification" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "insurance_claims" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "claim_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL REFERENCES "insurance_providers"("id") ON DELETE CASCADE,
    "policy_number" TEXT NOT NULL,
    "claimed_amount_paise" INTEGER NOT NULL,
    "approved_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "settled_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "patient_payable_paise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "rejection_reason" TEXT,
    "submitted_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "claim_documents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL REFERENCES "insurance_claims"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("hospital_id", "code")
);

CREATE TABLE IF NOT EXISTS "hospital_expenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "expense_number" TEXT UNIQUE NOT NULL,
    "hospital_id" UUID NOT NULL,
    "category_id" UUID NOT NULL REFERENCES "expense_categories"("id") ON DELETE CASCADE,
    "category_name" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "recorded_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "expense_date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "financial_transactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "department" TEXT,
    "revenue_category" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "performed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "financial_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "amount_paise" INTEGER,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
