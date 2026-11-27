import { apiRequest } from './api';
import { RoleCodeType } from '../types/auth';
import { HospitalRecord } from './superAdminService';

export interface DepartmentItem {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  description: string;
  floorLocation?: string | null;
  isActive: boolean;
  assignedDoctorsCount: number;
  assignedDoctors: Array<{ id: string; fullName: string; specialization: string }>;
  appointmentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorItem {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  medicalLicenseNumber: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  bio?: string | null;
  hospitalId: string;
  departmentId: string;
  departmentName: string;
  consultationFee?: number | null;
  slotDurationMinutes: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive?: boolean;
  appointmentsCount?: number;
}

export interface StaffMemberItem {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string;
  employeeCode: string;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  isActive: boolean;
  roles: RoleCodeType[];
  primaryRole: RoleCodeType | string;
  joinedAt: string;
}

export interface AppointmentItem {
  id: string;
  appointmentNumber: string;
  hospitalId: string;
  departmentId: string;
  departmentName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  patientId: string;
  patientName?: string;
  patientPhone?: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  type: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  reasonForVisit: string;
  cancellationReason?: string | null;
  statusHistory?: Array<{
    fromStatus: string | null;
    toStatus: string;
    changedByUserId: string;
    changedByRole: string;
    notes?: string;
    changedAt: string;
  }>;
}

export interface HospitalOverviewData {
  hospital: HospitalRecord | null;
  statistics: {
    totalPatients: number;
    totalDoctors: number;
    totalStaff: number;
    totalDepartments: number;
    todayAppointments: number;
    pendingAppointments: number;
    completedConsultations: number;
    cancelledAppointments: number;
    collectedRevenuePaise: number;
    grossInvoicedPaise: number;
    outstandingReceivablesPaise: number;
  };
  financialSummary: {
    hospitalId: string;
    currency: string;
    unit: string;
    grossInvoicedPaise: number;
    totalCreditNotesPaise: number;
    accountingRevenuePaise: number;
    collectedCashPaise: number;
    outstandingReceivablesPaise: number;
    paidExpensesPaise: number;
    netOperatingCashflowPaise: number;
    invoiceCount: number;
    capturedPaymentCount: number;
  };
  departmentPerformance: Array<{
    departmentId: string;
    departmentName: string;
    code: string;
    doctorsCount: number;
    appointmentsCount: number;
  }>;
  recentAppointments: AppointmentItem[];
  recentPatients: Array<{
    id: string;
    globalPatientId: string;
    fullName: string;
    phone: string;
    gender: string;
    bloodGroup: string;
    status: string;
    registeredAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string;
    createdAt: string;
  }>;
  lastUpdatedAt: string;
}

export const HospitalAdminService = {
  async getOverview() {
    const res = await apiRequest<{ data: HospitalOverviewData }>('/hospital/overview');
    return res.data;
  },

  async getReports(range: '7d' | '30d' | '90d' | '12m' = '30d') {
    const res = await apiRequest<{ data: HospitalOverviewData & { range: string } }>(
      `/hospital/reports?range=${range}`
    );
    return res.data;
  },

  // Departments
  async listDepartments(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest<{
      data: DepartmentItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/departments${qs}`);
  },

  async createDepartment(input: {
    name: string;
    code?: string;
    description?: string;
    floorLocation?: string;
    isActive?: boolean;
  }) {
    const res = await apiRequest<{ data: DepartmentItem }>('/departments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateDepartment(
    departmentId: string,
    updates: Partial<{
      name: string;
      code: string;
      description: string;
      floorLocation: string;
      isActive: boolean;
    }>
  ) {
    const res = await apiRequest<{ data: DepartmentItem }>(`/departments/${departmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  // Doctors
  async listDoctors(params?: { search?: string; departmentId?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.departmentId && params.departmentId !== 'ALL') q.set('departmentId', params.departmentId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest<{ data: DoctorItem[] }>(`/doctors${qs}`);
    return res.data;
  },

  async createDoctor(input: {
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
    medicalLicenseNumber: string;
    qualification: string;
    specialization: string;
    experienceYears?: number;
    departmentId?: string;
    departmentName?: string;
    consultationFee?: number;
    slotDurationMinutes?: number;
    bio?: string;
  }) {
    const res = await apiRequest<{ data: DoctorItem }>('/doctors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateDoctor(
    doctorId: string,
    updates: Partial<{
      fullName: string;
      phone: string;
      qualification: string;
      specialization: string;
      experienceYears: number;
      departmentId: string;
      departmentName: string;
      consultationFee: number;
      slotDurationMinutes: number;
      verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
      isActive: boolean;
      bio: string;
    }>
  ) {
    const res = await apiRequest<{ data: DoctorItem }>(`/doctors/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  async getDoctorAvailability(doctorId: string, date: string) {
    const res = await apiRequest<{
      data: {
        doctorId: string;
        doctorName: string;
        specialization: string;
        date: string;
        slotDurationMinutes: number;
        slots: Array<{ slotStartTime: string; slotEndTime: string; isAvailable: boolean }>;
      };
    }>(`/doctors/${doctorId}/availability?date=${encodeURIComponent(date)}`);
    return res.data;
  },

  // Staff
  async listStaff(params?: { search?: string; role?: string; department?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role && params.role !== 'ALL') q.set('role', params.role);
    if (params?.department && params.department !== 'ALL') q.set('department', params.department);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest<{ data: StaffMemberItem[] }>(`/staff${qs}`);
    return res.data;
  },

  async createStaff(input: {
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
    roleCode: RoleCodeType;
    department?: string;
    employeeCode?: string;
  }) {
    const res = await apiRequest<{ data: StaffMemberItem }>('/staff', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateMembership(
    membershipId: string,
    updates: {
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      department?: string;
      roles?: RoleCodeType[];
    }
  ) {
    const res = await apiRequest<{ data: unknown }>(`/memberships/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  // Appointments
  async listAppointments(params?: {
    date?: string;
    status?: string;
    doctorId?: string;
    departmentId?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.date) q.set('date', params.date);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.doctorId && params.doctorId !== 'ALL') q.set('doctorId', params.doctorId);
    if (params?.departmentId && params.departmentId !== 'ALL') q.set('departmentId', params.departmentId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await apiRequest<{ data: AppointmentItem[] }>(`/appointments${qs}`);
    return res.data;
  },

  async createAppointment(input: {
    departmentId: string;
    doctorId: string;
    patientId: string;
    appointmentDate: string;
    slotStartTime: string;
    slotEndTime: string;
    type?: 'OPD' | 'WALK_IN' | 'FOLLOW_UP';
    reasonForVisit: string;
  }) {
    const res = await apiRequest<{ data: AppointmentItem }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async updateAppointmentStatus(
    appointmentId: string,
    status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
    notes?: string
  ) {
    const res = await apiRequest<{ data: AppointmentItem }>(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
    return res.data;
  },

  async rescheduleAppointment(
    appointmentId: string,
    input: {
      appointmentDate: string;
      slotStartTime: string;
      slotEndTime: string;
      doctorId?: string;
      notes?: string;
    }
  ) {
    const res = await apiRequest<{ data: AppointmentItem }>(`/appointments/${appointmentId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  // Consultations & Clinical Overview
  async getConsultationsOverview() {
    const res = await apiRequest<{
      data: {
        encounters: Array<{
          id: string;
          patientId: string;
          patientName: string;
          doctorId: string;
          doctorName: string;
          doctorSpecialization: string;
          status: string;
          symptoms: string;
          assessment: string;
          diagnoses: Array<{ icd10Code: string; diagnosisName: string; classification: string }>;
          createdAt: string;
        }>;
        doctorWorkload: Array<{
          doctorId: string;
          doctorName: string;
          specialization: string;
          departmentName: string;
          pendingConsultations: number;
          ongoingConsultations: number;
          completedConsultations: number;
        }>;
        summary: {
          ongoing: number;
          completed: number;
          pendingQueue: number;
        };
      };
    }>('/consultations');
    return res.data;
  },

  // Prescriptions, Lab, Pharmacy, Billing
  async listPrescriptions() {
    const res = await apiRequest<{
      data: Array<{
        id: string;
        prescriptionNumber: string;
        patientId: string;
        doctorId: string;
        status: string;
        signedAt?: string;
        items: Array<{
          medicineName: string;
          strength: string;
          dosage: string;
          frequency: string;
          durationDays: number;
          quantity: number;
          instructions: string;
        }>;
      }>;
    }>('/prescriptions');
    return res.data;
  },

  async listLabOrders() {
    const res = await apiRequest<{
      data: Array<{
        id: string;
        orderNumber: string;
        patientId: string;
        testCode: string;
        testName: string;
        category: string;
        status: string;
        observedValue?: string;
        unit: string;
        referenceInterval: string;
        createdAt: string;
      }>;
    }>('/lab/orders');
    return res.data;
  },

  async listPharmacyBatches() {
    const res = await apiRequest<{
      data: Array<{
        id: string;
        medicineName: string;
        strength: string;
        batchNumber: string;
        expiryDate: string;
        sellingPricePaise: number;
        currentStock: number;
        reorderLevel: number;
      }>;
    }>('/pharmacy/batches');
    return res.data;
  },

  async listInvoices() {
    const res = await apiRequest<{
      data: Array<{
        id: string;
        invoiceNumber: string;
        patientId: string;
        status: string;
        subtotalPaise: number;
        discountPaise: number;
        taxPaise: number;
        totalPaise: number;
        creditNotePaise: number;
        paidPaise: number;
        balanceDuePaise: number;
        items: Array<{
          serviceCategory: string;
          description: string;
          quantity: number;
          unitPricePaise: number;
          lineTotalPaise: number;
        }>;
        createdAt: string;
      }>;
    }>('/billing/invoices');
    return res.data;
  },

  async createInvoice(input: {
    patientId: string;
    discountPaise?: number;
    finalizeImmediately?: boolean;
    items: Array<{
      serviceCategory: string;
      description: string;
      quantity: number;
      unitPricePaise: number;
      taxRatePercent?: number;
    }>;
  }) {
    const res = await apiRequest<{ data: unknown }>('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async listPayments() {
    return apiRequest<{
      data: Array<{
        id: string;
        receiptNumber: string | null;
        invoiceId: string;
        patientId: string;
        amountPaise: number;
        method: string;
        status: string;
        paidAt: string | null;
      }>;
      refunds: Array<{
        id: string;
        refundNumber: string;
        paymentId: string;
        invoiceId: string;
        amountPaise: number;
        reason: string;
        status: string;
        createdAt: string;
      }>;
    }>('/billing/payments');
  },

  async recordPayment(input: {
    invoiceId: string;
    amountPaise: number;
    method: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING';
    idempotencyKey: string;
  }) {
    const res = await apiRequest<{ data: unknown }>('/billing/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  async getFinancialAnalytics() {
    const res = await apiRequest<{
      data: HospitalOverviewData['financialSummary'];
    }>('/billing/analytics');
    return res.data;
  },
};
