# MediCore Database & Clinical Document Backup & Recovery Strategy

## 1. Recovery Objectives
- **Recovery Point Objective (RPO):** $\le 15$ minutes (via continuous WAL archiving / Point-in-Time Recovery).
- **Recovery Time Objective (RTO):** $\le 30$ minutes (verified via automated non-production recovery drills).

## 2. PostgreSQL Database Backups
1. **Automated Daily Snapshots:** Full logical (`pg_dump -Fc`) and physical volume snapshots taken daily at `01:30 IST`.
2. **Encryption at Rest & In Transit:** All backups are encrypted with AES-256-GCM using KMS-managed keys before upload to private object storage.
3. **Retention Policy:**
   - Daily backups retained for 30 days.
   - Weekly backups retained for 12 months.
   - Annual compliance archives retained per statutory healthcare record retention rules.

## 3. Private Medical & KYC Document Storage Backup
- Clinical documents (`clinical_documents`) and hospital onboarding verification files (`hospital_documents`) are stored in private, non-public object storage with versioning enabled and cross-region replication.

## 4. Non-Production Restoration Procedure & Drill Verification
Never assume a backup is valid until restoration succeeds:
1. Provision an isolated staging PostgreSQL instance.
2. Restore the latest encrypted dump:
   ```bash
   pg_restore --clean --no-owner -d "$STAGING_DATABASE_URL" latest_encrypted_backup.dump
   ```
3. Run schema & integrity verification (`npx prisma migrate status && npm test`).
4. Record the recovery drill timestamp and checksum in the `SUPER_ADMIN` System Health console (`/api/v1/observability/diagnostics`).
