# MediCore Production Security Assessment Checklist & Known Risks

## 1. Verified Security Controls
- [x] **Password Security:** Argon2id hashing; plaintext passwords are never stored or logged.
- [x] **Token & Device Security:** Short-lived JWT access tokens, rotating refresh tokens with reuse family revocation, Android Keystore AES-256-GCM token storage, optional TOTP MFA, and per-device session revocation.
- [x] **Multi-Hospital Tenant Isolation:** Server-side verification of `userId`, active `HospitalMembership`, and hospital-scoped `RoleCode` on every tenant request (`requireHospitalAccess`). Client-supplied `hospital_id` or `role` values are never trusted without database verification.
- [x] **Financial Integrity:** All monetary fields use exact integer minor units (`paise`). Finalized invoices are immutable (`PUT` blocked; adjustments require `CreditNote`). Razorpay webhooks and checkouts verify HMAC-SHA256 signatures and enforce idempotency keys.
- [x] **SaaS Subscription & Entitlement Enforcement:** `FeatureEntitlementService` validates plan features and quotas (`maxBranches`, `maxStaffAccounts`) server-side. SaaS revenue is strictly separated from patient hospital billing.
- [x] **AI Safety & Privacy:** `GEMINI_API_KEY` is backend-only and never exposed to Android. `AIResponseValidator` blocks prompt injection, `UserAIConsent` enforces opt-in/opt-out, and `AIClinicalNoteDraft` requires explicit `DOCTOR` approval.
- [x] **Notification Privacy:** Transactional outbox pattern (`NotificationOutbox`) redacts PHI (diagnoses, medications, lab values) from public lock-screen notifications.
- [x] **Ranchi Hospital Directory Data Quality:** All 25 imported Ranchi hospitals start as `PENDING_VERIFICATION` and `isActiveTenant = false`. Missing contact fields remain `null` rather than fabricated.

## 2. Unresolved Production Risks & Operational Requirements Before Live Launch
1. **Facility Verification Requirement:** The 25 Ranchi Hospital Directory listings (`RNC001`–`RNC025`) are compiled from public government and hospital listings. Each facility's phone, email, legal entity, and 24x7 emergency status must be directly confirmed with the hospital before `SUPER_ADMIN` transitions it to `VERIFIED`.
2. **External Gateway & SMTP/SMS Credentials:** Production deployment requires provisioning live Razorpay merchant credentials, DLT-registered Indian SMS templates, and a dedicated Firebase Cloud Messaging service account in secret manager.
3. **Legal & Regulatory Review:** DPDP Act 2023 and Clinical Establishments Act compliance documentation must be reviewed by qualified legal counsel prior to commercial patient onboarding.
