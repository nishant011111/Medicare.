# MediCore Privacy, Consent & DPDP Act (India) Readiness

## 1. Data Fiduciary & Processor Roles
- Participating hospitals act as Data Fiduciaries for clinical records created within their facility, while MediCore operates as the multi-tenant healthcare SaaS platform processor with strict tenant isolation.

## 2. Explicit Consent Management
- **Cross-Hospital EHR Sharing:** Clinical records are scoped to the creating hospital (`PatientHospitalLink`). Cross-hospital access is blocked unless explicit patient consent is recorded (`POST /api/v1/patients/:id/consent`).
- **AI Feature Consent:** Granular per-user consent (`UserAIConsent`) controls AI Assistant Chat, Report Summarization, Clinical Drafting, and Anonymized Analytics (`GET/PUT /api/v1/ai/consent`).

## 3. Data Retention, Suspension & Deletion
- When a hospital's SaaS subscription expires or is suspended, clinical and financial records are **preserved** in read-only archival compliance mode—never automatically deleted.
- Patients may submit data access and correction requests through their hospital's Data Protection Officer, logged in `ClinicalAuditLog`.

> **Disclaimer:** This technical readiness architecture does not constitute formal legal certification. Qualified legal review under the Digital Personal Data Protection Act, 2023 (India) is required prior to commercial launch.
