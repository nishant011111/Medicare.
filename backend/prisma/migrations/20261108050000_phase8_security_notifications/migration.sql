-- MediCore Phase 8: Advanced Security, Device Sessions, Transactional Outbox Notifications & Messaging
ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';

CREATE TABLE IF NOT EXISTS "user_mfa_configs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "method" TEXT NOT NULL DEFAULT 'TOTP',
  "secret_encrypted" TEXT,
  "backup_codes_hash" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "verified_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "registered_devices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "device_name" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'ANDROID',
  "device_model" TEXT,
  "app_version" TEXT NOT NULL DEFAULT '1.0.0',
  "fcm_token" TEXT,
  "fcm_token_valid" BOOLEAN NOT NULL DEFAULT true,
  "ip_address" TEXT,
  "session_status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "is_suspicious" BOOLEAN NOT NULL DEFAULT false,
  "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "registered_devices_user_id_session_status_idx" ON "registered_devices"("user_id", "session_status");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "push_enabled" BOOLEAN NOT NULL DEFAULT true,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "sms_enabled" BOOLEAN NOT NULL DEFAULT true,
  "appointment_alerts" BOOLEAN NOT NULL DEFAULT true,
  "clinical_alerts" BOOLEAN NOT NULL DEFAULT true,
  "financial_alerts" BOOLEAN NOT NULL DEFAULT true,
  "operations_alerts" BOOLEAN NOT NULL DEFAULT true,
  "redact_lock_screen_text" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "hospital_id" UUID REFERENCES "hospitals"("id") ON DELETE SET NULL,
  "recipient_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "public_title" TEXT NOT NULL,
  "public_body" TEXT NOT NULL,
  "authenticated_body" TEXT NOT NULL,
  "deep_link_route" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'FCM',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "notification_outbox_recipient_user_id_created_at_idx" ON "notification_outbox"("recipient_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_outbox_status_retry_count_idx" ON "notification_outbox"("status", "retry_count");

CREATE TABLE IF NOT EXISTS "messaging_delivery_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "hospital_id" UUID,
  "recipient" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider_name" TEXT NOT NULL,
  "template_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "external_msg_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "messaging_delivery_logs_channel_status_created_at_idx" ON "messaging_delivery_logs"("channel", "status", "created_at");
