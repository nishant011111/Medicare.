import { apiRequest } from './api';
import { AppointmentItem, DoctorItem } from './hospitalAdminService';

export interface PatientDashboardStats {
  totalPatients: number;
  recentlyRegisteredPatients: number;
  activePatients: number;
  inactivePatients: number;
  archivedPatients: number;
  todayRegistrations: number;
  patientsWithUpcomingAppointments: number;
}

export interface PatientDirectoryItem {
  id: string;
  userId: string;
  globalPatientId: string;
  hospitalRegistrationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  assignedDoctorId?: string | null;
  assignedDoctorName?: string | null;
  assignedDoctorSpecialization?: string | null;
  hospitalName: string;
  patientStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  registrationDate: string;
  medicalNotes?: string | null;
}

export interface PatientDocumentItem {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string | null;
  title: string;
  documentType: 'DISCHARGE_SUMMARY' | 'RADIOLOGY' | 'CONSENT_FORM' | 'EXTERNAL_REPORT' | 'LAB_ATTACHMENT';
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  uploadedByUserId: string;
  uploadedByName: string;
  createdAt: string;
}

export interface PatientProfileDetailResponse {
  patient: PatientDirectoryItem;
  hospital: {
    id: string;
    name: string;
    city: string;
    state: string;
  } | null;
  assignedDoctor: DoctorItem | null;
  permissions: {
    canViewClinicalHistory: boolean;
    canViewPrescriptions: boolean;
    canViewLabReports: boolean;
    canEditDemographics: boolean;
    canManageStatus: boolean;
  };
  appointments: AppointmentItem[];
  encounters: Array<{
    id: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    doctorName: string;
    status: string;
    version: number;
    symptoms: string;
    examinationFindings: string;
    assessment: string;
    diagnoses: Array<{ icd10Code: string; diagnosisName: string; classification: string }>;
    treatmentPlan?: {
      clinicalGoals: string;
      treatmentInstructions: string;
      followUpInstructions: string;
      reviewDate: string;
    };
    createdAt: string;
  }>;
  vitals: Array<{
    id: string;
    systolicBp: number;
    diastolicBp: number;
    heartRateBpm: number;
    temperatureCelsius: number;
    respiratoryRate: number;
    oxygenSaturation: number;
    heightCm: number;
    weightKg: number;
    bmi: number;
    measurementSource: string;
    recordedAt: string;
  }>;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: string;
  }>;
  prescriptions: Array<{
    id: string;
    prescriptionNumber: string;
    doctorId: string;
    doctorName: string;
    status: string;
    signedAt?: string;
    createdAt?: string;
    items: Array<{
      medicineName: string;
      strength: string;
      dosage: string;
      route: string;
      frequency: string;
      durationDays: number;
      quantity: number;
      instructions: string;
    }>;
  }>;
  labReports: Array<{
    id: string;
    orderNumber: string;
    testCode: string;
    testName: string;
    category: string;
    status: string;
    observedValue?: string;
    unit: string;
    referenceInterval: string;
    createdAt: string;
  }>;
  documents: PatientDocumentItem[];
  activityHistory: Array<{
    id: string;
    action: string;
    actorName: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }>;
}

export const PatientManagementService = {
  async getDashboardStats() {
    const res = await apiRequest<{ data: PatientDashboardStats }>('/patients/stats');
    return res.data;
  },

  async queryDirectory(params?: {
    search?: string;
    status?: string;
    doctorId?: string;
    gender?: string;
    registeredFrom?: string;
    registeredTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.doctorId && params.doctorId !== 'ALL') q.set('doctorId', params.doctorId);
    if (params?.gender && params.gender !== 'ALL') q.set('gender', params.gender);
    if (params?.registeredFrom) q.set('registeredFrom', params.registeredFrom);
    if (params?.registeredTo) q.set('registeredTo', params.registeredTo);
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest<{
      data: PatientDirectoryItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
      stats: PatientDashboardStats;
    }>(`/patients/directory${qs}`);
  },

  async registerPatient(input: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    emergencyContactName: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone: string;
    assignedDoctorId?: string | null;
    medicalNotes?: string | null;
  }) {
    const res = await apiRequest<{ data: PatientDirectoryItem }>('/patients', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async getPatientDetail(patientId: string) {
    const res = await apiRequest<{ data: PatientProfileDetailResponse }>(`/patients/${patientId}`);
    return res.data;
  },

  async updatePatient(
    patientId: string,
    updates: Partial<{
      fullName: string;
      phone: string;
      email: string;
      dateOfBirth: string;
      gender: string;
      bloodGroup: string;
      address: string;
      city: string;
      state: string;
      postalCode: string;
      emergencyContactName: string;
      emergencyContactRelationship: string;
      emergencyContactPhone: string;
      assignedDoctorId: string | null;
      medicalNotes: string | null;
    }>
  ) {
    const res = await apiRequest<{ data: PatientDirectoryItem }>(`/patients/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  async updatePatientStatus(
    patientId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    reason?: string
  ) {
    const res = await apiRequest<{
      data: {
        patientId: string;
        globalPatientId: string;
        hospitalId: string;
        status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
        updatedAt: string;
      };
    }>(`/patients/${patientId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    return res.data;
  },

  async uploadDocument(
    patientId: string,
    input: {
      title: string;
      documentType: 'DISCHARGE_SUMMARY' | 'RADIOLOGY' | 'CONSENT_FORM' | 'EXTERNAL_REPORT' | 'LAB_ATTACHMENT';
      mimeType: string;
      fileSizeBytes?: number;
      contentBase64?: string;
    }
  ) {
    const res = await apiRequest<{ data: PatientDocumentItem }>(`/patients/${patientId}/documents`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async getAuthorizedDocumentDownload(patientId: string, documentId: string) {
    const res = await apiRequest<{
      data: {
        documentId: string;
        title: string;
        mimeType: string;
        fileSizeBytes: number;
        signedDownloadPath: string;
        expiresAt: string;
        contentBase64?: string;
      };
    }>(`/patients/${patientId}/documents/${documentId}/download`);
    return res.data;
  },
};
