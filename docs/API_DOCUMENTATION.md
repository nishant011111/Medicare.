# MediCore – Phase 2 REST API Documentation (`/api/v1`)

Base URL (Development): `http://localhost:4000/api/v1` (or `http://10.0.2.2:4000/api/v1` from Android Emulator)

All protected endpoints require header:
```http
Authorization: Bearer <accessToken>
```

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Registers a new user account with Argon2id password hashing, creates an email verification code, and enrolls the user in the default or specified hospital.
- **Request Body**:
```json
{
  "fullName": "Dr. Siddharth Roy",
  "email": "siddharth.roy@medicore.org",
  "phone": "+919123456780",
  "password": "StrongPassword#2026"
}
```
- **Response (`201 Created`)**: Returns `user`, `accessToken`, `refreshToken`, `expiresIn`, and `verificationCodePreview`.

### `POST /api/v1/auth/login`
Authenticates a user by email or phone number.
- **Request Body**:
```json
{
  "emailOrPhone": "ananya.sharma@medicore.org",
  "password": "MediCore@2026",
  "deviceInfo": "Android 15 Pixel 8"
}
```
- **Response (`200 OK`)**: Returns `user` (with `memberships`, `activeRoles`, `globalRoles`, `permissions`), `accessToken`, `refreshToken`, and `expiresIn`.

### `POST /api/v1/auth/refresh`
Rotates a valid refresh token and issues a new short-lived access token and refresh token. Detects token replay/reuse via `familyId` and revokes the entire token family if compromised.
- **Request Body**:
```json
{
  "refreshToken": "<refreshToken>"
}
```

### `POST /api/v1/auth/logout`
Revokes the active refresh token(s) for the authenticated user and writes an audit log entry.

### `POST /api/v1/auth/forgot-password`
Initiates password recovery and generates a 6-digit OTP code stored in `password_resets`.

### `POST /api/v1/auth/reset-password`
Verifies the 6-digit OTP code, hashes the new password with Argon2id, and revokes all existing refresh tokens for the user.

### `POST /api/v1/auth/verify-email`
Verifies the user's email address with the 6-digit verification code.

### `GET /api/v1/auth/me`
Returns the current authenticated user's profile, active hospital ID, hospital memberships, authorized roles, and resolved permissions.

---

## 2. Hospital Endpoints

### `GET /api/v1/hospitals`
Lists hospitals with pagination (`page`, `limit`) and filtering (`search`, `category`, `status`).

### `POST /api/v1/hospitals`
Registers a new hospital (`PENDING` approval status) and assigns the creator as `HOSPITAL_ADMIN` for that hospital.
- **Request Body**:
```json
{
  "name": "Sunrise Children Hospital",
  "registrationNumber": "MH-MUM-2026-555",
  "category": "Pediatric Specialty",
  "logoUrl": "https://assets.medicore.org/logos/sunrise.png",
  "address": "Linking Road, Bandra West",
  "city": "Mumbai",
  "state": "Maharashtra",
  "contactEmail": "info@sunrisechildren.org",
  "contactPhone": "+91 22 2600 1122",
  "totalBeds": 180,
  "availableBeds": 45
}
```

### `GET /api/v1/hospitals/:id`
Returns hospital profile, departments, bed capacity, and active staff statistics.

### `PATCH /api/v1/hospitals/:id`
Updates hospital profile, logo URL, address, contact details, or departments. Restricted to `HOSPITAL_ADMIN` of that specific hospital or `SUPER_ADMIN`.

### `POST /api/v1/hospitals/:id/select`
Switches the user's active hospital context and returns a newly scoped JWT `accessToken` and updated `user` profile.

---

## 3. Membership & Invitation Endpoints

### `GET /api/v1/memberships`
Returns the authenticated user's hospital memberships, or—when `?hospitalId=<uuid>` is passed by an authorized `HOSPITAL_ADMIN` of that hospital—returns all staff memberships for that hospital. Enforces strict cross-hospital tenant isolation.

### `POST /api/v1/hospitals/:id/invitations`
Creates a staff invitation (`DOCTOR`, `NURSE`, `RECEPTIONIST`, `PHARMACIST`, `LAB_TECHNICIAN`, `HOSPITAL_ADMIN`) for the specified hospital. Restricted to `HOSPITAL_ADMIN` of that hospital.

### `POST /api/v1/invitations/accept`
Accepts a pending hospital invitation using `inviteCode` and grants the assigned role and active hospital membership.

### `PATCH /api/v1/memberships/:id`
Updates staff membership status (`ACTIVE`, `INACTIVE`, `SUSPENDED`), department, or assigned roles. Strictly isolated to the hospital's own `HOSPITAL_ADMIN` or `SUPER_ADMIN`.

---

## 4. Super Admin Endpoints

### `GET /api/v1/admin/hospitals`
Lists all hospitals across all statuses (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), platform-wide statistics, and audit logs. Requires `SUPER_ADMIN`.

### `POST /api/v1/admin/hospitals/:id/approve`
Approves a pending hospital registration. Requires `SUPER_ADMIN`.

### `POST /api/v1/admin/hospitals/:id/reject`
Rejects a hospital registration with reason. Requires `SUPER_ADMIN`.

### `POST /api/v1/admin/hospitals/:id/suspend`
Suspends an active hospital. Requires `SUPER_ADMIN`.
