# MediCore Cloud Deployment & Android Release Guide

## 1. Backend Cloud Deployment (AWS / Google Cloud / Azure)
1. Provision managed PostgreSQL 16 (private VPC subnet, connection pooling enabled) and managed Redis 7.
2. Configure environment secrets in Cloud Secret Manager matching `/backend/.env.example`.
3. Build and push the container image:
   ```bash
   docker build -t medicore-backend:9.0.0 ./backend
   ```
4. Review and apply Prisma migrations in staging before production:
   ```bash
   npx prisma migrate deploy
   ```
5. Verify health checks (`GET /health/live` and `GET /health/ready`) before routing traffic.

## 2. Controlled Rollback Procedure
- If error rates or readiness checks fail after deployment, roll back the container revision to the previous immutable tag and restore the pre-migration database snapshot if a schema change occurred.

## 3. Android Release Instructions
1. Configure release keystore credentials via CI environment variables (`KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD`).
2. Run unit and Robolectric verification:
   ```bash
   gradle :app:testDebugUnitTest
   ```
3. Build signed release Android App Bundle (AAB):
   ```bash
   gradle :app:bundleRelease
   ```
