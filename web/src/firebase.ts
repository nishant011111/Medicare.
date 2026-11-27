import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_SELF_SIGNUP_ROLES = new Set([
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECHNICIAN',
  'ACCOUNTANT',
]);
const BOOTSTRAP_ADMIN_EMAIL = 'nishant00511@gmail.com';

function sanitizeString(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

export async function syncGoogleUserProfileToFirestore(input: {
  uid: string;
  displayName: string;
  photoUrl?: string | null;
  email: string;
  role: string;
  activeHospitalId?: string | null;
  department?: string | null;
}): Promise<void> {
  const uid = sanitizeString(input.uid, 128);
  if (!uid || !VALID_ID_REGEX.test(uid)) return;

  const userDocPath = `users/${uid}`;
  const privateDocPath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  const safeDisplayName = sanitizeString(input.displayName, 120) || 'MediCore Staff';
  const safePhotoUrl = sanitizeString(input.photoUrl, 512);
  const rawEmail = auth.currentUser?.email || input.email;
  const safeEmail = sanitizeString(rawEmail, 254);
  const safeHospitalId = sanitizeString(input.activeHospitalId, 128);
  const safeDepartment = sanitizeString(input.department, 120);

  const normalizedRole = input.role.trim().toUpperCase();
  const isBootstrap = safeEmail.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
  const safeCreateRole = isBootstrap
    ? 'SUPER_ADMIN'
    : ALLOWED_SELF_SIGNUP_ROLES.has(normalizedRole)
      ? normalizedRole
      : 'DOCTOR';

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userDocPath);
  }

  if (!existingSnap.exists()) {
    const batch = writeBatch(db);
    const publicPayload: Record<string, unknown> = {
      uid,
      displayName: safeDisplayName,
      role: safeCreateRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safePhotoUrl) {
      publicPayload.photoUrl = safePhotoUrl;
    }
    if (safeHospitalId) {
      publicPayload.activeHospitalId = safeHospitalId;
    }

    const privatePayload: Record<string, unknown> = {
      uid,
      email: safeEmail,
      authProvider: 'google.com',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safeDepartment) {
      privatePayload.department = safeDepartment;
    }

    batch.set(userRef, publicPayload);
    batch.set(privateRef, privatePayload);

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userDocPath);
    }
    return;
  }

  const publicUpdate: Record<string, unknown> = {
    displayName: safeDisplayName,
    updatedAt: serverTimestamp(),
  };
  if (safePhotoUrl) {
    publicUpdate.photoUrl = safePhotoUrl;
  }
  if (safeHospitalId) {
    publicUpdate.activeHospitalId = safeHospitalId;
  }

  try {
    await updateDoc(userRef, publicUpdate);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userDocPath);
  }

  let privateSnap;
  try {
    privateSnap = await getDoc(privateRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privateDocPath);
  }

  if (!privateSnap.exists()) {
    const batch = writeBatch(db);
    const privateCreate: Record<string, unknown> = {
      uid,
      email: safeEmail,
      authProvider: 'google.com',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safeDepartment) {
      privateCreate.department = safeDepartment;
    }
    batch.set(privateRef, privateCreate);
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, privateDocPath);
    }
  } else {
    const privateUpdate: Record<string, unknown> = {
      email: safeEmail,
      updatedAt: serverTimestamp(),
    };
    if (safeDepartment) {
      privateUpdate.department = safeDepartment;
    }
    try {
      await updateDoc(privateRef, privateUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, privateDocPath);
    }
  }
}

export interface SharedFirestoreHospitalInput {
  id: string;
  directoryCode: string;
  name: string;
  city: string;
  address: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'SUSPENDED';
  isActiveTenant: boolean;
}

export async function syncHospitalToFirestore(input: SharedFirestoreHospitalInput): Promise<void> {
  const safeId = sanitizeString(input.id, 128);
  if (!safeId || !VALID_ID_REGEX.test(safeId)) return;

  const docPath = `hospitals/${safeId}`;
  const ref = doc(db, 'hospitals', safeId);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  const baseFields = {
    directoryCode: sanitizeString(input.directoryCode, 32) || safeId.slice(0, 32),
    name: sanitizeString(input.name, 180) || 'Hospital',
    city: sanitizeString(input.city, 100) || 'Ranchi',
    address: sanitizeString(input.address, 300) || 'Ranchi',
    verificationStatus: input.verificationStatus,
    isActiveTenant: Boolean(input.isActiveTenant),
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    try {
      await setDoc(ref, {
        id: safeId,
        ...baseFields,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  } else {
    try {
      await updateDoc(ref, baseFields);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }
}

export async function fetchActiveHospitalsFromFirestore(): Promise<SharedFirestoreHospitalInput[]> {
  const path = 'hospitals';
  try {
    const q = query(collection(db, path), where('isActiveTenant', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id || d.id),
        directoryCode: String(data.directoryCode || d.id),
        name: String(data.name || ''),
        city: String(data.city || ''),
        address: String(data.address || ''),
        verificationStatus:
          data.verificationStatus === 'VERIFIED' || data.verificationStatus === 'SUSPENDED'
            ? data.verificationStatus
            : 'PENDING_VERIFICATION',
        isActiveTenant: Boolean(data.isActiveTenant),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface SharedFirestoreAppointmentInput {
  id: string;
  ownerId: string;
  hospitalId: string;
  bookingNumber: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  slotTime: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export async function syncAppointmentToFirestore(
  input: SharedFirestoreAppointmentInput
): Promise<void> {
  const safeId = sanitizeString(input.id, 128);
  const safeOwnerId = sanitizeString(input.ownerId, 128);
  const safeHospitalId = sanitizeString(input.hospitalId, 128);
  if (
    !safeId ||
    !VALID_ID_REGEX.test(safeId) ||
    !VALID_ID_REGEX.test(safeOwnerId) ||
    !VALID_ID_REGEX.test(safeHospitalId)
  ) {
    return;
  }

  const docPath = `appointments/${safeId}`;
  const ref = doc(db, 'appointments', safeId);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }

  if (!snap.exists()) {
    try {
      await setDoc(ref, {
        id: safeId,
        ownerId: safeOwnerId,
        hospitalId: safeHospitalId,
        bookingNumber: sanitizeString(input.bookingNumber, 40) || `OPD-${safeId.slice(0, 12)}`,
        doctorName: sanitizeString(input.doctorName, 120) || 'Attending Physician',
        department: sanitizeString(input.department, 100) || 'General Medicine',
        appointmentDate: sanitizeString(input.appointmentDate, 20),
        slotTime: sanitizeString(input.slotTime, 20),
        status: 'SCHEDULED',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  } else {
    try {
      await updateDoc(ref, {
        appointmentDate: sanitizeString(input.appointmentDate, 20),
        slotTime: sanitizeString(input.slotTime, 20),
        status: input.status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }
}
