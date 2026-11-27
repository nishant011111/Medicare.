# MediCore Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every undefined collection path must be denied by a top-level `match /{document=**} { allow read, write: if false; }` catch-all.
2. **Verified Email Mandate**: Every client write requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict PII Isolation**: Email addresses, phone numbers, and department details live exclusively under `/users/{userId}/private/{docId}` and are strictly restricted to `isOwner(userId)` or `isAdmin()`. No blanket `isSignedIn()` reads exist anywhere.
4. **No Self-Assigned Admin Escalation**: A non-admin user creating `/users/{userId}` cannot assign `role: 'SUPER_ADMIN'` or `role: 'HOSPITAL_ADMIN'`, and cannot modify `role` on subsequent updates.
5. **Strict Path ID & Volumetric Bounds**: All single-document path IDs must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`. Every string field has an explicit `.size()` bound; arrays are strictly capped (`<= 10` elements).
6. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on create and remain immutable on update. `updatedAt` must equal `request.time` on both create and update. `uid`, `ownerId`, `authorId`, and `hospitalId` are immutable after create.
7. **Terminal State Locking**: Once an appointment reaches `COMPLETED` or `CANCELLED`, or a clinical note reaches `FINALIZED`, non-admin clients cannot mutate it further.
8. **Secure List Queries**: `allow list` never performs `get()`/`exists()` and always binds `resource.data` directly to `request.auth.uid` (or `isBootstrapAdmin()`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on User Create**: Authenticated user `uid_attacker` creates `/users/uid_victim` with `{ "uid": "uid_victim", ... }` -> MUST be `PERMISSION_DENIED`.
2. **Privilege Escalation on User Create**: Non-admin user creates `/users/uid_attacker` with `{ "uid": "uid_attacker", "role": "SUPER_ADMIN", ... }` -> MUST be `PERMISSION_DENIED`.
3. **Role Mutation on User Update**: Existing `DOCTOR` updates `/users/uid_doctor` with `{ "role": "SUPER_ADMIN", "updatedAt": request.time }` -> MUST be `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Valid user creates `/users/uid_doctor` with extra ghost field `"isVerifiedAdmin": true` -> MUST be `PERMISSION_DENIED`.
5. **PII Cross-User Read Attack**: Authenticated user `uid_b` sends `get` to `/users/uid_a/private/info` -> MUST be `PERMISSION_DENIED`.
6. **Email Spoofing Without Verification**: Attacker token has `email: "nishant00511@gmail.com"` with `email_verified: false` attempting admin write to `/hospitals/RNC001` -> MUST be `PERMISSION_DENIED`.
7. **Path ID Poisoning**: Attacker writes to `/appointments/` with a 1500-character invalid ID containing spaces/symbols -> MUST be `PERMISSION_DENIED`.
8. **Backdated Timestamp Spoofing**: Authenticated user creates `/appointments/apt-1` with client-supplied `createdAt` not equal to `request.time` -> MUST be `PERMISSION_DENIED`.
9. **Orphaned Appointment Write**: User creates `/appointments/apt-2` referencing non-existent `hospitalId: "NON_EXISTENT_HOSP"` -> MUST be `PERMISSION_DENIED`.
10. **Terminal State Bypass**: Owner updates `/appointments/apt-done` whose existing `status == "COMPLETED"` back to `"SCHEDULED"` -> MUST be `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Owner updates `/clinical_notes/note-1` with whitelisted field `soapNote` set to a 10,000-character string or non-string boolean -> MUST be `PERMISSION_DENIED`.
12. **Unbounded Array / Query Scraping**: User writes 25 tags to `/clinical_notes/note-2` OR attempts unfiltered `list` on `/appointments` owned by another user -> MUST be `PERMISSION_DENIED`.
