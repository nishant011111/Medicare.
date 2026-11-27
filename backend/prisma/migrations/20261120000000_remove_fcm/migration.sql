-- Remove obsolete Firebase Cloud Messaging (FCM) columns and default channel
ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token";

ALTER TABLE "registered_devices"
  DROP COLUMN IF EXISTS "fcm_token",
  DROP COLUMN IF EXISTS "fcm_token_valid";

ALTER TABLE "notification_outbox"
  ALTER COLUMN "channel" SET DEFAULT 'IN_APP';
UPDATE "notification_outbox"
  SET "channel" = 'IN_APP'
  WHERE "channel" = 'FCM';
