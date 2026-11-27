-- MediCore Phase 7 PostgreSQL Migration: AI & Smart Hospital Intelligence
-- Includes all 12 AI models with hospital tenant isolation, consent management, and audit logs.
-- No API secrets are stored in database tables.

CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL REFERENCES "hospitals"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "user_role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 90,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
    "hospital_id" UUID NOT NULL,
    "sender_role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model_used" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_role" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GEMINI',
    "model_name" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_feedback" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "is_helpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_prompt_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "template_code" TEXT UNIQUE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "feature" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_model_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "feature" TEXT UNIQUE NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GEMINI',
    "model_name" TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "max_output_tokens" INTEGER NOT NULL DEFAULT 1024,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_report_summaries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "source_document_type" TEXT NOT NULL,
    "source_document_date" TEXT NOT NULL,
    "source_section_ref" TEXT NOT NULL,
    "extracted_facts_json" JSONB NOT NULL,
    "out_of_range_values_json" JSONB NOT NULL,
    "patient_friendly_summary" TEXT NOT NULL,
    "terminology_explanations" JSONB NOT NULL,
    "limitations_notice" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_clinical_note_drafts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "encounter_id" UUID,
    "author_doctor_id" UUID NOT NULL,
    "source_raw_notes" TEXT NOT NULL,
    "structured_symptoms" TEXT NOT NULL,
    "structured_examination" TEXT NOT NULL,
    "patient_history_summary" TEXT NOT NULL,
    "draft_follow_up" TEXT NOT NULL,
    "ai_model_version" TEXT NOT NULL,
    "review_status" TEXT NOT NULL DEFAULT 'DRAFT_PENDING_REVIEW',
    "approved_by_doctor_id" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_analytics_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "natural_query" TEXT NOT NULL,
    "resolved_intent" TEXT NOT NULL,
    "date_range_start" TEXT NOT NULL,
    "date_range_end" TEXT NOT NULL,
    "metric_definition" TEXT NOT NULL,
    "data_coverage" TEXT NOT NULL,
    "result_json" JSONB NOT NULL,
    "narrative_summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ai_forecast_results" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "forecast_type" TEXT NOT NULL,
    "horizon_days" INTEGER NOT NULL DEFAULT 14,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "data_coverage_window" TEXT NOT NULL,
    "limitations_notice" TEXT NOT NULL,
    "forecast_payload" JSONB NOT NULL,
    "generated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_ai_consents" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "allow_assistant_chat" BOOLEAN NOT NULL DEFAULT true,
    "allow_report_summarization" BOOLEAN NOT NULL DEFAULT true,
    "allow_clinical_drafting" BOOLEAN NOT NULL DEFAULT true,
    "allow_anonymized_analytics" BOOLEAN NOT NULL DEFAULT true,
    "consent_version" TEXT NOT NULL DEFAULT 'v1.0-2026',
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("user_id", "hospital_id")
);

CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "security_flags" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
