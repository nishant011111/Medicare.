/**
 * MediCore Firestore Rules Security Test Suite (Phase 0 TDD Specification)
 * Verifies all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 *
 * Designed for execution against the Firebase Emulator Suite (`@firebase/rules-unit-testing`).
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  actor: {
    uid: string;
    email: string;
    email_verified: boolean;
  };
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity spoofing when creating another user profile',
    operation: 'create',
    path: 'users/uid_victim',
    actor: { uid: 'uid_attacker', email: 'attacker@clinic.test', email_verified: true },
    payload: {
      uid: 'uid_victim',
      displayName: 'Spoofed Doctor',
      role: 'DOCTOR',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-assigned SUPER_ADMIN privilege escalation on create',
    operation: 'create',
    path: 'users/uid_attacker',
    actor: { uid: 'uid_attacker', email: 'attacker@clinic.test', email_verified: true },
    payload: {
      uid: 'uid_attacker',
      displayName: 'Self Admin',
      role: 'SUPER_ADMIN',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Role elevation on profile update',
    operation: 'update',
    path: 'users/uid_doctor',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      role: 'HOSPITAL_ADMIN',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow ghost field injection on user creation',
    operation: 'create',
    path: 'users/uid_doctor',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      uid: 'uid_doctor',
      displayName: 'Dr. Legit',
      role: 'DOCTOR',
      isVerifiedAdmin: true,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-user PII read on /users/{uid}/private/info',
    operation: 'get',
    path: 'users/uid_a/private/info',
    actor: { uid: 'uid_b', email: 'other@clinic.test', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unverified email spoofing bootstrap admin',
    operation: 'create',
    path: 'hospitals/RNC999',
    actor: { uid: 'uid_spoof', email: 'nishant00511@gmail.com', email_verified: false },
    payload: {
      id: 'RNC999',
      directoryCode: 'RNC999',
      name: 'Spoofed Hospital',
      city: 'Ranchi',
      address: '123 Fake Street',
      verificationStatus: 'VERIFIED',
      isActiveTenant: true,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path ID poisoning with oversized/invalid characters',
    operation: 'create',
    path: `appointments/${'bad id! '.repeat(200)}`,
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: { id: 'bad', ownerId: 'uid_doctor' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client-forged createdAt timestamp on appointment create',
    operation: 'create',
    path: 'appointments/apt_001',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      id: 'apt_001',
      ownerId: 'uid_doctor',
      hospitalId: 'RNC001',
      bookingNumber: 'OPD-2026-001',
      doctorName: 'Dr. Verma',
      department: 'Cardiology',
      appointmentDate: '2026-12-01',
      slotTime: '10:00 AM',
      status: 'SCHEDULED',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Orphaned appointment referencing non-existent hospital',
    operation: 'create',
    path: 'appointments/apt_orphan',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      id: 'apt_orphan',
      ownerId: 'uid_doctor',
      hospitalId: 'NON_EXISTENT_HOSP',
      bookingNumber: 'OPD-2026-002',
      doctorName: 'Dr. Verma',
      department: 'Cardiology',
      appointmentDate: '2026-12-01',
      slotTime: '10:30 AM',
      status: 'SCHEDULED',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal state bypass on completed appointment',
    operation: 'update',
    path: 'appointments/apt_completed',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      status: 'SCHEDULED',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value poisoning on clinical note update (invalid type / >4000 chars)',
    operation: 'update',
    path: 'clinical_notes/note_001',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      soapNote: 'X'.repeat(5000),
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unbounded tags array (>10 items) on clinical note create',
    operation: 'create',
    path: 'clinical_notes/note_overflow',
    actor: { uid: 'uid_doctor', email: 'doctor@clinic.test', email_verified: true },
    payload: {
      id: 'note_overflow',
      authorId: 'uid_doctor',
      hospitalId: 'RNC001',
      summary: 'Overflow tags',
      soapNote: 'Valid note text',
      tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11'],
      status: 'DRAFT',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
];
