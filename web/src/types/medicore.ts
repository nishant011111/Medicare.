export type RoleCodeType =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'ACCOUNTANT'
  | 'PATIENT';

export interface UserMembership {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  department: string | null;
  employeeCode: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  roles?: RoleCodeType[];
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  activeHospitalId: string | null;
  globalRoles: RoleCodeType[];
  activeRoles: RoleCodeType[];
  permissions: string[];
  memberships: UserMembership[];
  onboardingCompleted?: boolean;
  patientProfile?: {
    id: string;
    globalPatientId: string;
    onboardingCompleted: boolean;
    profileCompletionPercent: number;
  } | null;
}

export interface DirectoryHospitalRecord {
  id: string;
  directoryCode: string;
  name: string;
  facilityType: string;
  ownershipType: string;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  website: string | null;
  emergencyAvailable: boolean | null;
  specialties: string[];
  verificationStatus: 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  sourceName: string;
  sourceUrl: string;
  dataStatusNote: string | null;
  isActiveTenant: boolean;
  lastVerifiedAt: string | null;
}

export interface HospitalRecord {
  id: string;
  name: string;
  registrationNumber: string;
  category: string;
  logoUrl: string | null;
  address: string;
  city: string;
  state: string;
  contactEmail: string;
  contactPhone: string;
  totalBeds: number;
  availableBeds: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE';
  departments: string[];
  about?: string | null;
  operatingHours?: string | null;
  createdAt: string;
}

export interface DoctorRecord {
  id: string;
  userId?: string;
  hospitalId: string;
  hospitalName?: string;
  departmentId: string;
  departmentName: string;
  fullName: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
  slotDurationMinutes?: number;
  verificationStatus?: string;
  isAvailableToday?: boolean;
}

export interface AppointmentRecord {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  hospitalName?: string;
  departmentId: string;
  departmentName?: string;
  doctorId: string;
  doctorName?: string;
  specialization?: string;
  patientId: string;
  patientName?: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  reasonForVisit: string;
  cancellationReason?: string | null;
  createdAt: string;
}

export interface PatientRecord {
  id: string;
  userId: string;
  globalPatientId: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface EhrTimelineData {
  patient: PatientRecord | null;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  conditions: Array<{
    id: string;
    conditionName: string;
    icd10Code?: string;
    clinicalStatus: string;
  }>;
  vitals: Array<{
    id: string;
    systolicBp?: number;
    diastolicBp?: number;
    heartRateBpm?: number;
    temperatureCelsius?: number;
    oxygenSaturation?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: number;
    recordedAt: string;
  }>;
  encounters: Array<{
    id: string;
    encounterType: string;
    status: string;
    symptoms?: string;
    diagnosisName?: string;
    icd10Code?: string;
    assessment?: string;
    createdAt: string;
  }>;
  prescriptions: Array<{
    id: string;
    prescriptionNumber: string;
    status: string;
    doctorName?: string;
    notes?: string;
    items: Array<{
      id?: string;
      medicineName: string;
      strength: string;
      dosage: string;
      frequency: string;
      durationDays: number;
      quantity: number;
      instructions: string;
    }>;
    createdAt: string;
  }>;
}

export interface LabReportRecord {
  id: string;
  reportNumber: string;
  orderNumber?: string;
  patientId: string;
  patientName?: string;
  testName?: string;
  category?: string;
  status?: string;
  summaryNotes?: string;
  observedValue?: string;
  unit?: string;
  referenceInterval?: string;
  generatedAt: string;
}

export interface MedicineBatchRecord {
  id: string;
  hospitalId: string;
  medicineName: string;
  genericName?: string;
  strength?: string;
  batchNumber: string;
  expiryDate: string;
  sellingPriceInr: number;
  currentStock: number;
  reorderLevel?: number;
}

export interface BedRecord {
  id: string;
  hospitalId: string;
  wardName: string;
  wardType?: string;
  roomNumber?: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';
  dailyRateInr: number;
  currentAdmissionId?: string | null;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  hospitalId: string;
  hospitalName?: string;
  patientId: string;
  patientName?: string;
  status: 'DRAFT' | 'FINALIZED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  creditNotePaise: number;
  paidPaise: number;
  balanceDuePaise: number;
  invoiceDate?: string;
  dueDate?: string;
  createdAt: string;
  items?: Array<{
    description: string;
    serviceCategory?: string;
    quantity: number;
    unitPricePaise: number;
    taxRatePercent?: number;
    lineTotalPaise?: number;
  }>;
}

export interface SubscriptionPlanRecord {
  planCode: string;
  name: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  trialDays: number;
  maxStaffAccounts: number;
  maxBranches: number;
  monthlyAiTokenLimit: number;
  features: string[];
}
