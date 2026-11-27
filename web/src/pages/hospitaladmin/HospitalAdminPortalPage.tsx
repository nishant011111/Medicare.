import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BriefcaseMedical,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardPlus,
  CreditCard,
  FlaskConical,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  XCircle,
  BarChart3,
  Clock,
} from 'lucide-react';
import { ApplicationShell } from '../../layouts/ApplicationShell';
import { Button } from '../../components/ui/Button';
import { SelectInput, TextareaInput, TextInput } from '../../components/ui/FormControls';
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatCard,
  StatusBadge,
} from '../../components/ui/FeedbackAndData';
import { Modal, Tabs } from '../../components/ui/OverlaysAndNavigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrencyFromPaise, formatDate, formatDateTime } from '../../utils/format';
import {
  AppointmentItem,
  DepartmentItem,
  DoctorItem,
  HospitalAdminService,
  HospitalOverviewData,
  StaffMemberItem,
} from '../../services/hospitalAdminService';
import { SuperAdminService } from '../../services/superAdminService';
import { PatientManagementService, PatientDirectoryItem } from '../../services/patientManagementService';
import { ApiClientError } from '../../services/api';
import { RoleCodeType } from '../../types/auth';

export type HospitalAdminModuleType =
  | 'overview'
  | 'departments'
  | 'doctors'
  | 'staff'
  | 'appointments'
  | 'consultations'
  | 'prescriptions'
  | 'laboratory'
  | 'pharmacy'
  | 'billing'
  | 'payments'
  | 'reports'
  | 'settings';

export const HospitalAdminPortalPage: React.FC<{ module: HospitalAdminModuleType }> = ({ module }) => {
  const navigate = useNavigate();
  const { user, activeHospital, logoutAllSessions } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Overview & Reports State
  const [overview, setOverview] = useState<HospitalOverviewData | null>(null);
  const [reportRange, setReportRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  // 2. Departments State
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState('ALL');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    floorLocation: 'Floor 1, Wing A',
    isActive: true,
  });

  // 3. Doctors State
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorDeptFilter, setDoctorDeptFilter] = useState('ALL');
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);
  const [availabilityModalDoctor, setAvailabilityModalDoctor] = useState<DoctorItem | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<
    Array<{ slotStartTime: string; slotEndTime: string; isAvailable: boolean }>
  >([]);
  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    medicalLicenseNumber: '',
    qualification: 'MBBS, MD',
    specialization: 'Cardiology',
    experienceYears: '8',
    departmentId: '',
    consultationFee: '600',
    slotDurationMinutes: '30',
    bio: '',
  });

  // 4. Staff State
  const [staffList, setStaffList] = useState<StaffMemberItem[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');
  const [staffStatusFilter, setStaffStatusFilter] = useState('ALL');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    roleCode: RoleCodeType;
    department: string;
    employeeCode: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleCode: 'NURSE',
    department: 'General Ward',
    employeeCode: '',
  });

  // 5. Appointments State
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [patientsList, setPatientsList] = useState<PatientDirectoryItem[]>([]);
  const [calendarView, setCalendarView] = useState<'list' | 'daily' | 'weekly' | 'monthly'>('list');
  const [aptDateFilter, setAptDateFilter] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState('ALL');
  const [showBookAptModal, setShowBookAptModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentItem | null>(null);
  const [aptForm, setAptForm] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().slice(0, 10),
    slotStartTime: '10:00',
    slotEndTime: '10:30',
    type: 'OPD' as 'OPD' | 'WALK_IN' | 'FOLLOW_UP',
    reasonForVisit: 'Outpatient clinical consultation',
  });

  // 6. Consultations, Prescriptions, Lab, Pharmacy, Billing, Payments State
  const [consultationsData, setConsultationsData] = useState<Awaited<
    ReturnType<typeof HospitalAdminService.getConsultationsOverview>
  > | null>(null);
  const [prescriptions, setPrescriptions] = useState<
    Awaited<ReturnType<typeof HospitalAdminService.listPrescriptions>>
  >([]);
  const [labOrders, setLabOrders] = useState<
    Awaited<ReturnType<typeof HospitalAdminService.listLabOrders>>
  >([]);
  const [pharmacyBatches, setPharmacyBatches] = useState<
    Awaited<ReturnType<typeof HospitalAdminService.listPharmacyBatches>>
  >([]);
  const [invoices, setInvoices] = useState<
    Awaited<ReturnType<typeof HospitalAdminService.listInvoices>>
  >([]);
  const [paymentsData, setPaymentsData] = useState<Awaited<
    ReturnType<typeof HospitalAdminService.listPayments>
  > | null>(null);
  const [financialSummary, setFinancialSummary] = useState<
    HospitalOverviewData['financialSummary'] | null
  >(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    serviceCategory: 'OPD_CONSULTATION',
    description: 'Specialist OPD Consultation & Diagnostic Assessment',
    quantity: '1',
    unitPriceInr: '600',
    taxRatePercent: '0',
  });
  const [showPaymentModal, setShowPaymentModal] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    balanceDuePaise: number;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'NET_BANKING'>('UPI');

  // 7. Hospital Settings Form State
  const [hospitalSettingsForm, setHospitalSettingsForm] = useState({
    name: '',
    category: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    totalBeds: '100',
    availableBeds: '25',
  });

  const loadModuleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (module === 'overview') {
        const data = await HospitalAdminService.getOverview();
        setOverview(data);
      } else if (module === 'reports') {
        const data = await HospitalAdminService.getReports(reportRange);
        setOverview(data);
      } else if (module === 'departments') {
        const res = await HospitalAdminService.listDepartments({
          search: deptSearch,
          status: deptStatusFilter,
        });
        setDepartments(res.data || []);
      } else if (module === 'doctors') {
        const [docs, deptsRes] = await Promise.all([
          HospitalAdminService.listDoctors({
            search: doctorSearch,
            departmentId: doctorDeptFilter,
          }),
          HospitalAdminService.listDepartments(),
        ]);
        setDoctors(docs || []);
        setDepartments(deptsRes.data || []);
        if (!doctorForm.departmentId && deptsRes.data?.length) {
          setDoctorForm((prev) => ({ ...prev, departmentId: deptsRes.data[0].id }));
        }
      } else if (module === 'staff') {
        const list = await HospitalAdminService.listStaff({
          search: staffSearch,
          role: staffRoleFilter,
          status: staffStatusFilter,
        });
        setStaffList(list || []);
      } else if (module === 'appointments') {
        const [apts, docs, deptsRes, patsRes] = await Promise.all([
          HospitalAdminService.listAppointments({
            date: aptDateFilter || undefined,
            status: aptStatusFilter,
          }),
          HospitalAdminService.listDoctors(),
          HospitalAdminService.listDepartments(),
          PatientManagementService.queryDirectory({ limit: 100 }),
        ]);
        setAppointments(apts || []);
        setDoctors(docs || []);
        setDepartments(deptsRes.data || []);
        setPatientsList(patsRes.data || []);
      } else if (module === 'consultations') {
        const data = await HospitalAdminService.getConsultationsOverview();
        setConsultationsData(data);
      } else if (module === 'prescriptions') {
        const list = await HospitalAdminService.listPrescriptions();
        setPrescriptions(list || []);
      } else if (module === 'laboratory') {
        const list = await HospitalAdminService.listLabOrders();
        setLabOrders(list || []);
      } else if (module === 'pharmacy') {
        const list = await HospitalAdminService.listPharmacyBatches();
        setPharmacyBatches(list || []);
      } else if (module === 'billing' || module === 'payments') {
        const [invList, payRes, fin, patsRes] = await Promise.all([
          HospitalAdminService.listInvoices(),
          HospitalAdminService.listPayments(),
          HospitalAdminService.getFinancialAnalytics(),
          PatientManagementService.queryDirectory({ limit: 100 }),
        ]);
        setInvoices(invList || []);
        setPaymentsData(payRes);
        setFinancialSummary(fin);
        setPatientsList(patsRes.data || []);
      } else if (module === 'settings') {
        const data = await HospitalAdminService.getOverview();
        setOverview(data);
        if (data.hospital) {
          setHospitalSettingsForm({
            name: data.hospital.name,
            category: data.hospital.category,
            contactEmail: data.hospital.contactEmail,
            contactPhone: data.hospital.contactPhone,
            address: data.hospital.address,
            city: data.hospital.city,
            state: data.hospital.state,
            totalBeds: String(data.hospital.totalBeds),
            availableBeds: String(data.hospital.availableBeds),
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hospital module data');
    } finally {
      setLoading(false);
    }
  }, [
    module,
    reportRange,
    deptSearch,
    deptStatusFilter,
    doctorSearch,
    doctorDeptFilter,
    staffSearch,
    staffRoleFilter,
    staffStatusFilter,
    aptDateFilter,
    aptStatusFilter,
  ]);

  useEffect(() => {
    void loadModuleData();
  }, [loadModuleData]);

  // Handlers
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingDept) {
        await HospitalAdminService.updateDepartment(editingDept.id, deptForm);
        showToast({
          title: 'Department updated',
          description: `${deptForm.name} updated.`,
          variant: 'success',
        });
      } else {
        await HospitalAdminService.createDepartment(deptForm);
        showToast({
          title: 'Department created',
          description: `${deptForm.name} added to hospital departments.`,
          variant: 'success',
        });
      }
      setShowDeptModal(false);
      setEditingDept(null);
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Department error',
        description: err instanceof ApiClientError ? err.message : 'Unable to save department',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingDoctor) {
        await HospitalAdminService.updateDoctor(editingDoctor.id, {
          fullName: doctorForm.fullName,
          phone: doctorForm.phone,
          qualification: doctorForm.qualification,
          specialization: doctorForm.specialization,
          experienceYears: Number(doctorForm.experienceYears) || 5,
          departmentId: doctorForm.departmentId,
          consultationFee: Number(doctorForm.consultationFee) || 500,
          slotDurationMinutes: Number(doctorForm.slotDurationMinutes) || 30,
          bio: doctorForm.bio,
        });
        showToast({
          title: 'Doctor profile updated',
          description: `${doctorForm.fullName} updated.`,
          variant: 'success',
        });
      } else {
        await HospitalAdminService.createDoctor({
          fullName: doctorForm.fullName,
          email: doctorForm.email,
          phone: doctorForm.phone,
          medicalLicenseNumber: doctorForm.medicalLicenseNumber,
          qualification: doctorForm.qualification,
          specialization: doctorForm.specialization,
          experienceYears: Number(doctorForm.experienceYears) || 5,
          departmentId: doctorForm.departmentId,
          consultationFee: Number(doctorForm.consultationFee) || 500,
          slotDurationMinutes: Number(doctorForm.slotDurationMinutes) || 30,
          bio: doctorForm.bio,
        });
        showToast({
          title: 'Doctor added to hospital',
          description: `${doctorForm.fullName} assigned to department.`,
          variant: 'success',
        });
      }
      setShowDoctorModal(false);
      setEditingDoctor(null);
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Doctor operation failed',
        description: err instanceof ApiClientError ? err.message : 'Unable to save doctor',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await HospitalAdminService.createStaff(staffForm);
      showToast({
        title: 'Staff account provisioned',
        description: `${staffForm.fullName} added as ${staffForm.roleCode}.`,
        variant: 'success',
      });
      setShowStaffModal(false);
      setStaffForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        roleCode: 'NURSE',
        department: 'General Ward',
        employeeCode: '',
      });
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Staff creation failed',
        description: err instanceof ApiClientError ? err.message : 'Check input parameters',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookOrRescheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (rescheduleTarget) {
        await HospitalAdminService.rescheduleAppointment(rescheduleTarget.id, {
          appointmentDate: aptForm.appointmentDate,
          slotStartTime: aptForm.slotStartTime,
          slotEndTime: aptForm.slotEndTime,
          doctorId: aptForm.doctorId,
          notes: 'Rescheduled via Hospital Admin Console',
        });
        showToast({
          title: 'Appointment rescheduled',
          description: `Moved to ${aptForm.appointmentDate} at ${aptForm.slotStartTime}.`,
          variant: 'success',
        });
      } else {
        await HospitalAdminService.createAppointment({
          patientId: aptForm.patientId,
          departmentId: aptForm.departmentId || departments[0]?.id || 'dept-1',
          doctorId: aptForm.doctorId,
          appointmentDate: aptForm.appointmentDate,
          slotStartTime: aptForm.slotStartTime,
          slotEndTime: aptForm.slotEndTime,
          type: aptForm.type,
          reasonForVisit: aptForm.reasonForVisit,
        });
        showToast({
          title: 'Appointment scheduled',
          description: `Confirmed for ${aptForm.appointmentDate} at ${aptForm.slotStartTime}.`,
          variant: 'success',
        });
      }
      setShowBookAptModal(false);
      setRescheduleTarget(null);
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Scheduling conflict or validation error',
        description: err instanceof ApiClientError ? err.message : 'Unable to book slot',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const unitPricePaise = Math.round(Number(invoiceForm.unitPriceInr) * 100);
      await HospitalAdminService.createInvoice({
        patientId: invoiceForm.patientId,
        finalizeImmediately: true,
        items: [
          {
            serviceCategory: invoiceForm.serviceCategory,
            description: invoiceForm.description,
            quantity: Number(invoiceForm.quantity) || 1,
            unitPricePaise,
            taxRatePercent: Number(invoiceForm.taxRatePercent) || 0,
          },
        ],
      });
      showToast({
        title: 'Invoice finalized',
        description: 'Patient invoice generated in exact integer paise.',
        variant: 'success',
      });
      setShowCreateInvoiceModal(false);
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Invoice error',
        description: err instanceof ApiClientError ? err.message : 'Unable to create invoice',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || submitting) return;
    setSubmitting(true);
    try {
      await HospitalAdminService.recordPayment({
        invoiceId: showPaymentModal.invoiceId,
        amountPaise: showPaymentModal.balanceDuePaise,
        method: paymentMethod,
        idempotencyKey: `pay-${showPaymentModal.invoiceId}-${Date.now()}`,
      });
      showToast({
        title: 'Payment captured',
        description: `${formatCurrencyFromPaise(showPaymentModal.balanceDuePaise)} recorded via ${paymentMethod}.`,
        variant: 'success',
      });
      setShowPaymentModal(null);
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Payment failed',
        description: err instanceof ApiClientError ? err.message : 'Unable to record payment',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHospitalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.hospital || submitting) return;
    setSubmitting(true);
    try {
      await SuperAdminService.updateHospital(overview.hospital.id, {
        name: hospitalSettingsForm.name,
        category: hospitalSettingsForm.category,
        contactEmail: hospitalSettingsForm.contactEmail,
        contactPhone: hospitalSettingsForm.contactPhone,
        address: hospitalSettingsForm.address,
        city: hospitalSettingsForm.city,
        state: hospitalSettingsForm.state,
        totalBeds: Number(hospitalSettingsForm.totalBeds) || 100,
        availableBeds: Number(hospitalSettingsForm.availableBeds) || 25,
      });
      showToast({
        title: 'Hospital settings updated',
        description: 'Hospital profile and bed capacity saved.',
        variant: 'success',
      });
      await loadModuleData();
    } catch (err) {
      showToast({
        title: 'Settings update failed',
        description: err instanceof ApiClientError ? err.message : 'Unable to save hospital settings',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const moduleHeaders: Record<HospitalAdminModuleType, { title: string; subtitle: string }> = {
    overview: {
      title: `${activeHospital?.hospitalName || 'Hospital'} Operations Dashboard`,
      subtitle: 'Real-time hospital statistics, department performance, appointments, and revenue.',
    },
    departments: {
      title: 'Hospital Department Management',
      subtitle: 'Configure clinical specialty departments, floor wings, and assigned physicians.',
    },
    doctors: {
      title: 'Attending Doctor Roster & Availability',
      subtitle: 'Manage hospital-assigned doctors, specializations, consultation fees, and schedules.',
    },
    staff: {
      title: 'Hospital Staff Management',
      subtitle: 'Provision and manage Nurses, Receptionists, Pharmacists, Lab Technicians, and Accountants.',
    },
    appointments: {
      title: 'Appointment Scheduling & Queue Management',
      subtitle: 'Daily, weekly, and monthly OPD schedule with conflict-free slot validation.',
    },
    consultations: {
      title: 'Consultations & Clinical Operations Overview',
      subtitle: 'Operational visibility into ongoing encounters, completed consultations, and doctor workload.',
    },
    prescriptions: {
      title: 'Hospital E-Prescriptions Registry',
      subtitle: 'Authorized read-only visibility into signed and dispensed hospital prescriptions.',
    },
    laboratory: {
      title: 'Laboratory Operations Overview',
      subtitle: 'Track diagnostic test orders, specimen statuses, and verified pathology reports.',
    },
    pharmacy: {
      title: 'Pharmacy & Medicine Batch Inventory',
      subtitle: 'Monitor medicine stock levels, batch expiry dates, and FEFO dispensing status.',
    },
    billing: {
      title: 'Hospital Billing & GST Invoices',
      subtitle: 'Generate itemized invoices, issue credit notes, and monitor outstanding receivables.',
    },
    payments: {
      title: 'Payments, Receipts & Revenue Settlement',
      subtitle: 'Verified payment capture history, cash/UPI/card settlements, and refund records.',
    },
    reports: {
      title: 'Hospital Reports & Operational Analytics',
      subtitle: 'Date-filtered hospital performance, patient registrations, and financial summaries.',
    },
    settings: {
      title: 'Hospital Profile & Account Security Settings',
      subtitle: 'Update hospital contact details, capacity, and manage authenticated device sessions.',
    },
  };

  const headerInfo = moduleHeaders[module];

  return (
    <ApplicationShell
      pageTitle={headerInfo.title}
      pageSubtitle={headerInfo.subtitle}
      breadcrumbs={[
        { label: activeHospital?.hospitalName || 'Hospital Admin', path: '/hospital/dashboard' },
        { label: headerInfo.title },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => void loadModuleData()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CalendarClock className="w-3.5 h-3.5" />}
            onClick={() => navigate('/appointments')}
          >
            Appointments
          </Button>
        </div>
      }
    >
      {error && <ErrorState title="Module Error" message={error} onRetry={loadModuleData} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {/* ===================================================================
          MODULE 1: HOSPITAL OVERVIEW DASHBOARD
      =================================================================== */}
      {!loading && module === 'overview' && overview && (
        <div className="space-y-6">
          {/* 9 Real Backend Statistic Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Registered Patients"
              value={String(overview.statistics.totalPatients)}
              trend="Hospital-linked patients"
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Total Doctors"
              value={String(overview.statistics.totalDoctors)}
              trend="Assigned physicians"
              trendDirection="up"
              icon={<Stethoscope className="w-4 h-4" />}
            />
            <StatCard
              label="Total Hospital Staff"
              value={String(overview.statistics.totalStaff)}
              trend="Active memberships"
              trendDirection="up"
              icon={<UserCog className="w-4 h-4" />}
            />
            <StatCard
              label="Active Departments"
              value={String(overview.statistics.totalDepartments)}
              trend="Clinical wings"
              trendDirection="up"
              icon={<Building2 className="w-4 h-4" />}
            />
            <StatCard
              label="Today's Appointments"
              value={String(overview.statistics.todayAppointments)}
              trend={`${overview.statistics.pendingAppointments} pending queue`}
              trendDirection="up"
              icon={<CalendarClock className="w-4 h-4" />}
            />
            <StatCard
              label="Completed Consultations"
              value={String(overview.statistics.completedConsultations)}
              trend={`${overview.statistics.cancelledAppointments} cancelled`}
              trendDirection="up"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              label="Collected Hospital Revenue"
              value={formatCurrencyFromPaise(overview.statistics.collectedRevenuePaise)}
              trend={`${overview.financialSummary.capturedPaymentCount} verified payments`}
              trendDirection="up"
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatCard
              label="Gross Invoiced Billing"
              value={formatCurrencyFromPaise(overview.statistics.grossInvoicedPaise)}
              trend={`${overview.financialSummary.invoiceCount} finalized invoices`}
              trendDirection="up"
              icon={<Receipt className="w-4 h-4" />}
            />
            <StatCard
              label="Outstanding Receivables"
              value={formatCurrencyFromPaise(overview.statistics.outstandingReceivablesPaise)}
              trend="Unpaid balance due"
              trendDirection="neutral"
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          {/* Quick Actions + Department Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Hospital Admin Quick Shortcuts" className="lg:col-span-1">
              <div className="grid grid-cols-1 gap-2.5">
                <Button variant="primary" fullWidth onClick={() => navigate('/appointments')}>
                  Schedule OPD Appointment
                </Button>
                <Button variant="outline" fullWidth onClick={() => navigate('/doctors')}>
                  Manage Doctors &amp; Roster
                </Button>
                <Button variant="outline" fullWidth onClick={() => navigate('/departments')}>
                  Manage Hospital Departments
                </Button>
                <Button variant="outline" fullWidth onClick={() => navigate('/staff-management')}>
                  Manage Hospital Staff
                </Button>
                <Button variant="outline" fullWidth onClick={() => navigate('/reports-analytics')}>
                  Reports &amp; Analytics
                </Button>
              </div>
            </Card>

            <Card
              title="Department Performance Breakdown"
              subtitle="Assigned doctors and scheduled appointments per department"
              className="lg:col-span-2"
            >
              {overview.departmentPerformance.length === 0 ? (
                <EmptyState title="No departments configured" description="Add departments to track specialty metrics." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                        <th className="py-2 pr-3 font-semibold">Department</th>
                        <th className="py-2 px-3 font-semibold">Code</th>
                        <th className="py-2 px-3 font-semibold text-right">Assigned Doctors</th>
                        <th className="py-2 pl-3 font-semibold text-right">Appointments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {overview.departmentPerformance.map((d) => (
                        <tr key={d.departmentId}>
                          <td className="py-2.5 pr-3 font-bold text-[#102F4D] dark:text-white">
                            {d.departmentName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#718096]">{d.code}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{d.doctorsCount}</td>
                          <td className="py-2.5 pl-3 text-right font-bold text-[#0866B2]">
                            {d.appointmentsCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Appointments & Recent Patients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Recent Hospital Appointments"
              headerRight={
                <Link to="/appointments" className="text-xs font-semibold text-[#0866B2] hover:underline">
                  View Calendar
                </Link>
              }
            >
              {overview.recentAppointments.length === 0 ? (
                <EmptyState title="No appointments booked yet" description="Book an OPD appointment to populate the schedule." />
              ) : (
                <div className="space-y-2.5 text-xs">
                  {overview.recentAppointments.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[#102F4D] dark:text-white">
                          {apt.patientName} · <span className="font-mono text-[11px]">{apt.appointmentNumber}</span>
                        </p>
                        <p className="text-[#718096]">
                          {apt.doctorName} ({apt.departmentName}) · {apt.appointmentDate} at {apt.slotStartTime}
                        </p>
                      </div>
                      <StatusBadge
                        label={apt.status}
                        variant={
                          apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
                            ? 'success'
                            : apt.status === 'CANCELLED'
                            ? 'error'
                            : 'warning'
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Recent Patient Registrations">
              {overview.recentPatients.length === 0 ? (
                <EmptyState title="No patients registered yet" description="Patients registered through your hospital or the MediCore Patient App will appear here." />
              ) : (
                <div className="space-y-2.5 text-xs">
                  {overview.recentPatients.slice(0, 5).map((pat) => (
                    <div
                      key={pat.id}
                      className="p-3 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[#102F4D] dark:text-white">
                          {pat.fullName}
                        </p>
                        <p className="text-[#718096]">
                          {pat.globalPatientId} · {pat.gender} · {pat.bloodGroup} · {pat.phone}
                        </p>
                      </div>
                      <StatusBadge label={pat.status} variant="success" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODULE 2: DEPARTMENT MANAGEMENT
      =================================================================== */}
      {!loading && module === 'departments' && (
        <Card
          title="Hospital Departments"
          subtitle="Manage clinical specialties, floor locations, and department status"
          headerRight={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingDept(null);
                setDeptForm({
                  name: '',
                  code: '',
                  description: '',
                  floorLocation: 'Floor 2, Wing B',
                  isActive: true,
                });
                setShowDeptModal(true);
              }}
            >
              Add Department
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2">
              <TextInput
                placeholder="Search department name, code, or floor..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectInput
              value={deptStatusFilter}
              onChange={(e) => setDeptStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>

          {departments.length === 0 ? (
            <EmptyState
              title="No departments found"
              description="Create a clinical department for your hospital."
              actionLabel="Add Department"
              onAction={() => setShowDeptModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                    <th className="py-2.5 pr-3 font-semibold">Department Name &amp; Code</th>
                    <th className="py-2.5 px-3 font-semibold">Description &amp; Location</th>
                    <th className="py-2.5 px-3 font-semibold">Assigned Doctors</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-[#102F4D] dark:text-white">{d.name}</div>
                        <div className="text-[11px] font-mono text-[#718096]">{d.code}</div>
                      </td>
                      <td className="py-3 px-3 text-[#718096] dark:text-slate-300">
                        <div>{d.description}</div>
                        <div className="text-[11px]">{d.floorLocation || 'Main Building'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#102F4D] dark:text-white">
                          {d.assignedDoctorsCount} doctors
                        </span>
                        <span className="text-[11px] text-[#718096] block">
                          {d.appointmentsCount} appointments
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          label={d.isActive ? 'ACTIVE' : 'INACTIVE'}
                          variant={d.isActive ? 'success' : 'warning'}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDept(d);
                            setDeptForm({
                              name: d.name,
                              code: d.code,
                              description: d.description,
                              floorLocation: d.floorLocation || '',
                              isActive: d.isActive,
                            });
                            setShowDeptModal(true);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 3: DOCTOR MANAGEMENT
      =================================================================== */}
      {!loading && module === 'doctors' && (
        <Card
          title="Hospital Doctors Roster"
          subtitle="Manage attending physicians, specializations, consultation fees, and schedules"
          headerRight={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingDoctor(null);
                setDoctorForm({
                  fullName: '',
                  email: '',
                  phone: '',
                  medicalLicenseNumber: `MCI-JH-${Date.now().toString().slice(-5)}`,
                  qualification: 'MBBS, MD',
                  specialization: 'Cardiology',
                  experienceYears: '8',
                  departmentId: departments[0]?.id || '',
                  consultationFee: '600',
                  slotDurationMinutes: '30',
                  bio: '',
                });
                setShowDoctorModal(true);
              }}
            >
              Add Doctor
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2">
              <TextInput
                placeholder="Search doctor name, specialization, or department..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <SelectInput
              value={doctorDeptFilter}
              onChange={(e) => setDoctorDeptFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Departments' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
          </div>

          {doctors.length === 0 ? (
            <EmptyState
              title="No doctors registered in this hospital"
              description="Add a doctor to enable OPD appointment scheduling and clinical consultations."
              actionLabel="Add Doctor"
              onAction={() => setShowDoctorModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                    <th className="py-2.5 pr-3 font-semibold">Doctor &amp; License</th>
                    <th className="py-2.5 px-3 font-semibold">Specialization &amp; Dept</th>
                    <th className="py-2.5 px-3 font-semibold">Fee &amp; Slot</th>
                    <th className="py-2.5 px-3 font-semibold">Appointments</th>
                    <th className="py-2.5 px-3 font-semibold">Verification</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-[#102F4D] dark:text-white">{doc.fullName}</div>
                        <div className="text-[11px] font-mono text-[#718096]">
                          {doc.medicalLicenseNumber} · {doc.qualification}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#172B43] dark:text-slate-200">
                          {doc.specialization}
                        </div>
                        <div className="text-[11px] text-[#718096]">{doc.departmentName}</div>
                      </td>
                      <td className="py-3 px-3 text-[#172B43] dark:text-slate-200">
                        ₹{doc.consultationFee || 500} · {doc.slotDurationMinutes}m
                      </td>
                      <td className="py-3 px-3 font-bold text-[#0866B2]">
                        {doc.appointmentsCount ?? 0}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          label={doc.verificationStatus}
                          variant={doc.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setAvailabilityModalDoctor(doc);
                              const today = new Date().toISOString().slice(0, 10);
                              const avail = await HospitalAdminService.getDoctorAvailability(doc.id, today);
                              setAvailabilitySlots(avail.slots || []);
                            }}
                          >
                            Slots
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDoctor(doc);
                              setDoctorForm({
                                fullName: doc.fullName,
                                email: doc.email || '',
                                phone: doc.phone || '',
                                medicalLicenseNumber: doc.medicalLicenseNumber,
                                qualification: doc.qualification,
                                specialization: doc.specialization,
                                experienceYears: String(doc.experienceYears),
                                departmentId: doc.departmentId,
                                consultationFee: String(doc.consultationFee || 500),
                                slotDurationMinutes: String(doc.slotDurationMinutes || 30),
                                bio: doc.bio || '',
                              });
                              setShowDoctorModal(true);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 4: STAFF MANAGEMENT
      =================================================================== */}
      {!loading && module === 'staff' && (
        <Card
          title="Hospital Staff Directory"
          subtitle="Manage Nurses, Receptionists, Pharmacists, Lab Technicians, and Accountants"
          headerRight={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowStaffModal(true)}
            >
              Add Staff Member
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <TextInput
              placeholder="Search staff name, email, employee code, or department..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
            <SelectInput
              value={staffRoleFilter}
              onChange={(e) => setStaffRoleFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Staff Roles' },
                { value: 'NURSE', label: 'NURSE' },
                { value: 'RECEPTIONIST', label: 'RECEPTIONIST' },
                { value: 'PHARMACIST', label: 'PHARMACIST' },
                { value: 'LAB_TECHNICIAN', label: 'LAB_TECHNICIAN' },
                { value: 'ACCOUNTANT', label: 'ACCOUNTANT' },
                { value: 'DOCTOR', label: 'DOCTOR' },
                { value: 'HOSPITAL_ADMIN', label: 'HOSPITAL_ADMIN' },
              ]}
            />
            <SelectInput
              value={staffStatusFilter}
              onChange={(e) => setStaffStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
              ]}
            />
          </div>

          {staffList.length === 0 ? (
            <EmptyState
              title="No staff accounts match your filter"
              description="Provision a hospital staff account with role-based permissions."
              actionLabel="Add Staff Member"
              onAction={() => setShowStaffModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                    <th className="py-2.5 pr-3 font-semibold">Staff Member &amp; Code</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Department</th>
                    <th className="py-2.5 px-3 font-semibold">Joined</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {staffList.map((s) => (
                    <tr key={s.membershipId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-3">
                        <div className="font-bold text-[#102F4D] dark:text-white">{s.fullName}</div>
                        <div className="text-[11px] text-[#718096]">
                          {s.employeeCode} · {s.email}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#0866B2] dark:text-sky-400">
                        {s.roles.join(', ')}
                      </td>
                      <td className="py-3 px-3 text-[#172B43] dark:text-slate-200">{s.department}</td>
                      <td className="py-3 px-3 text-[#718096]">{formatDate(s.joinedAt)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge
                          label={s.status}
                          variant={s.status === 'ACTIVE' ? 'success' : 'error'}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Button
                          size="sm"
                          variant={s.status === 'ACTIVE' ? 'danger' : 'secondary'}
                          onClick={async () => {
                            const nextStatus = s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                            await HospitalAdminService.updateMembership(s.membershipId, {
                              status: nextStatus,
                            });
                            showToast({
                              title: `Staff membership ${nextStatus.toLowerCase()}`,
                              description: `${s.fullName} membership status updated.`,
                              variant: 'success',
                            });
                            await loadModuleData();
                          }}
                        >
                          {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 5: APPOINTMENT MANAGEMENT
      =================================================================== */}
      {!loading && module === 'appointments' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              tabs={[
                { id: 'list', label: `Appointment Queue (${appointments.length})` },
                { id: 'daily', label: 'Daily View' },
                { id: 'weekly', label: 'Weekly View' },
                { id: 'monthly', label: 'Monthly View' },
              ]}
              activeTab={calendarView}
              onChange={(id) => setCalendarView(id as any)}
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setRescheduleTarget(null);
                setAptForm({
                  patientId: patientsList[0]?.id || '',
                  departmentId: departments[0]?.id || '',
                  doctorId: doctors[0]?.id || '',
                  appointmentDate: new Date().toISOString().slice(0, 10),
                  slotStartTime: '10:00',
                  slotEndTime: '10:30',
                  type: 'OPD',
                  reasonForVisit: 'Outpatient clinical consultation',
                });
                setShowBookAptModal(true);
              }}
            >
              Schedule Appointment
            </Button>
          </div>

          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <TextInput
                type="date"
                label="Filter by Date"
                value={aptDateFilter}
                onChange={(e) => setAptDateFilter(e.target.value)}
              />
              <SelectInput
                label="Filter by Status"
                value={aptStatusFilter}
                onChange={(e) => setAptStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'CONFIRMED', label: 'CONFIRMED' },
                  { value: 'CHECKED_IN', label: 'CHECKED_IN' },
                  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
                  { value: 'COMPLETED', label: 'COMPLETED' },
                  { value: 'CANCELLED', label: 'CANCELLED' },
                ]}
              />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAptDateFilter('');
                    setAptStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {appointments.length === 0 ? (
              <EmptyState
                title="No appointments scheduled"
                description="Schedule an OPD appointment for a registered patient."
                actionLabel="Schedule Appointment"
                onAction={() => setShowBookAptModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2.5 pr-3 font-semibold">Appointment # &amp; Patient</th>
                      <th className="py-2.5 px-3 font-semibold">Doctor &amp; Department</th>
                      <th className="py-2.5 px-3 font-semibold">Date &amp; Slot</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-[#102F4D] dark:text-white">
                            {apt.patientName}
                          </div>
                          <div className="text-[11px] font-mono text-[#718096]">
                            {apt.appointmentNumber} · {apt.type}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#172B43] dark:text-slate-200">
                            {apt.doctorName}
                          </div>
                          <div className="text-[11px] text-[#718096]">{apt.departmentName}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#172B43] dark:text-slate-200">
                          {apt.appointmentDate} · {apt.slotStartTime}–{apt.slotEndTime}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge
                            label={apt.status}
                            variant={
                              apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
                                ? 'success'
                                : apt.status === 'CANCELLED'
                                ? 'error'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {apt.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  await HospitalAdminService.updateAppointmentStatus(
                                    apt.id,
                                    'CHECKED_IN',
                                    'Patient checked in at reception'
                                  );
                                  showToast({
                                    title: 'Patient checked in',
                                    description: `${apt.appointmentNumber} marked CHECKED_IN.`,
                                    variant: 'success',
                                  });
                                  await loadModuleData();
                                }}
                              >
                                Check In
                              </Button>
                            )}
                            {apt.status === 'CHECKED_IN' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  await HospitalAdminService.updateAppointmentStatus(
                                    apt.id,
                                    'COMPLETED',
                                    'Consultation completed'
                                  );
                                  showToast({
                                    title: 'Appointment completed',
                                    description: `${apt.appointmentNumber} marked COMPLETED.`,
                                    variant: 'success',
                                  });
                                  await loadModuleData();
                                }}
                              >
                                Complete
                              </Button>
                            )}
                            {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRescheduleTarget(apt);
                                    setAptForm({
                                      patientId: apt.patientId,
                                      departmentId: apt.departmentId,
                                      doctorId: apt.doctorId,
                                      appointmentDate: apt.appointmentDate,
                                      slotStartTime: apt.slotStartTime,
                                      slotEndTime: apt.slotEndTime,
                                      type: apt.type,
                                      reasonForVisit: apt.reasonForVisit,
                                    });
                                    setShowBookAptModal(true);
                                  }}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={async () => {
                                    await HospitalAdminService.updateAppointmentStatus(
                                      apt.id,
                                      'CANCELLED',
                                      'Cancelled by Hospital Admin'
                                    );
                                    showToast({
                                      title: 'Appointment cancelled',
                                      description: `${apt.appointmentNumber} cancelled.`,
                                      variant: 'info',
                                    });
                                    await loadModuleData();
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================
          MODULE 6: CONSULTATIONS & MEDICAL OPERATIONS
      =================================================================== */}
      {!loading && module === 'consultations' && consultationsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Ongoing Consultations"
              value={String(consultationsData.summary.ongoing)}
              trend="Active clinical encounters"
              trendDirection="up"
              icon={<ClipboardPlus className="w-4 h-4" />}
            />
            <StatCard
              label="Completed Consultations"
              value={String(consultationsData.summary.completed)}
              trend="Finalized clinical notes"
              trendDirection="up"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              label="Pending Queue"
              value={String(consultationsData.summary.pendingQueue)}
              trend="Awaiting physician"
              trendDirection="neutral"
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Doctor Workload & Consultation Distribution"
            subtitle="Clinical documentation and prescribing remain strictly restricted to authorized DOCTOR roles"
          >
            {consultationsData.doctorWorkload.length === 0 ? (
              <EmptyState title="No doctor workload records" description="Add doctors to monitor clinical workload." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2.5 pr-3 font-semibold">Doctor</th>
                      <th className="py-2.5 px-3 font-semibold">Department</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Pending Queue</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Ongoing</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {consultationsData.doctorWorkload.map((w) => (
                      <tr key={w.doctorId}>
                        <td className="py-2.5 pr-3 font-bold text-[#102F4D] dark:text-white">
                          {w.doctorName} ({w.specialization})
                        </td>
                        <td className="py-2.5 px-3 text-[#718096]">{w.departmentName}</td>
                        <td className="py-2.5 px-3 text-right">{w.pendingConsultations}</td>
                        <td className="py-2.5 px-3 text-right">{w.ongoingConsultations}</td>
                        <td className="py-2.5 pl-3 text-right font-bold text-[#16A36A]">
                          {w.completedConsultations}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================
          MODULE 7: PRESCRIPTIONS OVERVIEW
      =================================================================== */}
      {!loading && module === 'prescriptions' && (
        <Card
          title="Hospital Prescriptions Overview"
          subtitle="Read-only operational overview of signed e-prescriptions (Modification restricted to prescribing Doctor)"
        >
          {prescriptions.length === 0 ? (
            <EmptyState title="No prescriptions issued yet" description="Signed doctor prescriptions will appear here." />
          ) : (
            <div className="space-y-3 text-xs">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-4 rounded-xl bg-[#F4F7FB] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[#102F4D] dark:text-white">{rx.prescriptionNumber}</p>
                    <p className="text-[#718096]">
                      {rx.items.map((i) => `${i.medicineName} (${i.dosage})`).join(', ')}
                    </p>
                  </div>
                  <StatusBadge label={rx.status} variant="success" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 8: LABORATORY OVERVIEW
      =================================================================== */}
      {!loading && module === 'laboratory' && (
        <Card
          title="Hospital Laboratory Orders & Reports"
          subtitle="Operational visibility into pending tests, sample collection, and verified reports"
        >
          {labOrders.length === 0 ? (
            <EmptyState title="No lab orders recorded" description="Diagnostic lab requisitions for your hospital will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                    <th className="py-2.5 pr-3 font-semibold">Order #</th>
                    <th className="py-2.5 px-3 font-semibold">Test Name &amp; Category</th>
                    <th className="py-2.5 px-3 font-semibold">Observed Value</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {labOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 pr-3 font-mono font-bold">{o.orderNumber}</td>
                      <td className="py-2.5 px-3">
                        {o.testName} ({o.category})
                      </td>
                      <td className="py-2.5 px-3">
                        {o.observedValue ? `${o.observedValue} ${o.unit}` : 'Pending result'}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <StatusBadge label={o.status} variant={o.status === 'VERIFIED' ? 'success' : 'warning'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 9: PHARMACY OVERVIEW
      =================================================================== */}
      {!loading && module === 'pharmacy' && (
        <Card
          title="Hospital Pharmacy & Medicine Stock Batches"
          subtitle="Monitor batch stock levels, expiry dates, and reorder thresholds"
        >
          {pharmacyBatches.length === 0 ? (
            <EmptyState title="No medicine batches in inventory" description="Pharmacy stock batches for this hospital will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                    <th className="py-2.5 pr-3 font-semibold">Medicine &amp; Strength</th>
                    <th className="py-2.5 px-3 font-semibold">Batch Number</th>
                    <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {pharmacyBatches.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 pr-3 font-bold text-[#102F4D] dark:text-white">
                        {b.medicineName} ({b.strength})
                      </td>
                      <td className="py-2.5 px-3 font-mono">{b.batchNumber}</td>
                      <td className="py-2.5 px-3">{b.expiryDate}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrencyFromPaise(b.sellingPricePaise)}</td>
                      <td className="py-2.5 pl-3 text-right font-bold">{b.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ===================================================================
          MODULE 10 & 11: BILLING & PAYMENTS
      =================================================================== */}
      {!loading && (module === 'billing' || module === 'payments') && financialSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Gross Invoiced"
              value={formatCurrencyFromPaise(financialSummary.grossInvoicedPaise)}
              trend={`${financialSummary.invoiceCount} invoices`}
              trendDirection="up"
              icon={<Receipt className="w-4 h-4" />}
            />
            <StatCard
              label="Collected Cash / UPI / Card"
              value={formatCurrencyFromPaise(financialSummary.collectedCashPaise)}
              trend={`${financialSummary.capturedPaymentCount} verified payments`}
              trendDirection="up"
              icon={<CreditCard className="w-4 h-4" />}
            />
            <StatCard
              label="Outstanding Balance Due"
              value={formatCurrencyFromPaise(financialSummary.outstandingReceivablesPaise)}
              trend="Pending collection"
              trendDirection="neutral"
              icon={<Clock className="w-4 h-4" />}
            />
            <StatCard
              label="Credit Notes Issued"
              value={formatCurrencyFromPaise(financialSummary.totalCreditNotesPaise)}
              trend="Authorized adjustments"
              trendDirection="neutral"
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          <Card
            title="Hospital Invoices & Payment Settlement"
            subtitle="Invoices are only marked PAID when payment status is verified by the backend"
            headerRight={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setInvoiceForm((prev) => ({
                    ...prev,
                    patientId: patientsList[0]?.id || '',
                  }));
                  setShowCreateInvoiceModal(true);
                }}
              >
                Create Invoice
              </Button>
            }
          >
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices generated yet"
                description="Create an itemized hospital invoice for a registered patient."
                actionLabel="Create Invoice"
                onAction={() => setShowCreateInvoiceModal(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2.5 pr-3 font-semibold">Invoice #</th>
                      <th className="py-2.5 px-3 font-semibold">Items</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Paid</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-3 pr-3 font-mono font-bold text-[#102F4D] dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-3 text-[#718096]">
                          {inv.items.map((i) => i.description).join(', ')}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">
                          {formatCurrencyFromPaise(inv.totalPaise)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#16A36A] font-semibold">
                          {formatCurrencyFromPaise(inv.paidPaise)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#102F4D] dark:text-white">
                          {formatCurrencyFromPaise(inv.balanceDuePaise)}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge
                            label={inv.status}
                            variant={inv.status === 'PAID' ? 'success' : 'warning'}
                          />
                        </td>
                        <td className="py-3 pl-3 text-right">
                          {inv.balanceDuePaise > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setShowPaymentModal({
                                  invoiceId: inv.id,
                                  invoiceNumber: inv.invoiceNumber,
                                  balanceDuePaise: inv.balanceDuePaise,
                                })
                              }
                            >
                              Record Payment
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {paymentsData && paymentsData.data.length > 0 && (
            <Card title="Verified Payment Receipts History">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[#718096]">
                      <th className="py-2 pr-3 font-semibold">Receipt #</th>
                      <th className="py-2 px-3 font-semibold">Method</th>
                      <th className="py-2 px-3 font-semibold text-right">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 pl-3 font-semibold text-right">Paid At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {paymentsData.data.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 font-mono font-bold">{p.receiptNumber || p.id.slice(0, 8)}</td>
                        <td className="py-2.5 px-3 font-mono">{p.method}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#16A36A]">
                          {formatCurrencyFromPaise(p.amountPaise)}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge label={p.status} variant="success" />
                        </td>
                        <td className="py-2.5 pl-3 text-right text-[#718096]">
                          {p.paidAt ? formatDateTime(p.paidAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================
          MODULE 12: REPORTS & ANALYTICS
      =================================================================== */}
      {!loading && module === 'reports' && overview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#718096]">
              Hospital operational analytics and financial reports ({reportRange.toUpperCase()})
            </p>
            <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
              {(['7d', '30d', '90d', '12m'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReportRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    reportRange === r
                      ? 'bg-[#0866B2] text-white'
                      : 'text-[#718096] hover:text-[#102F4D]'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Patient Registrations"
              value={String(overview.statistics.totalPatients)}
              trend="Active in hospital"
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              label="Total Appointments"
              value={String(
                overview.statistics.pendingAppointments +
                  overview.statistics.completedConsultations +
                  overview.statistics.cancelledAppointments
              )}
              trend={`${overview.statistics.completedConsultations} completed`}
              trendDirection="up"
              icon={<CalendarClock className="w-4 h-4" />}
            />
            <StatCard
              label="Accounting Revenue"
              value={formatCurrencyFromPaise(overview.financialSummary.accountingRevenuePaise)}
              trend="Net of credit notes"
              trendDirection="up"
              icon={<BarChart3 className="w-4 h-4" />}
            />
            <StatCard
              label="Collected Cashflow"
              value={formatCurrencyFromPaise(overview.financialSummary.collectedCashPaise)}
              trend="Captured settlements"
              trendDirection="up"
              icon={<CreditCard className="w-4 h-4" />}
            />
          </div>
        </div>
      )}

      {/* ===================================================================
          MODULE 13: HOSPITAL SETTINGS
      =================================================================== */}
      {!loading && module === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Hospital Profile & Contact Settings" className="lg:col-span-2">
            <form onSubmit={handleSaveHospitalSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput
                  label="Hospital Name"
                  value={hospitalSettingsForm.name}
                  onChange={(e) => setHospitalSettingsForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <TextInput
                  label="Category"
                  value={hospitalSettingsForm.category}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, category: e.target.value }))
                  }
                  required
                />
                <TextInput
                  label="Contact Email"
                  type="email"
                  value={hospitalSettingsForm.contactEmail}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, contactEmail: e.target.value }))
                  }
                  required
                />
                <TextInput
                  label="Contact Phone"
                  value={hospitalSettingsForm.contactPhone}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, contactPhone: e.target.value }))
                  }
                  required
                />
                <TextInput
                  label="City"
                  value={hospitalSettingsForm.city}
                  onChange={(e) => setHospitalSettingsForm((p) => ({ ...p, city: e.target.value }))}
                  required
                />
                <TextInput
                  label="State"
                  value={hospitalSettingsForm.state}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, state: e.target.value }))
                  }
                  required
                />
                <TextInput
                  label="Total Beds"
                  type="number"
                  value={hospitalSettingsForm.totalBeds}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, totalBeds: e.target.value }))
                  }
                  required
                />
                <TextInput
                  label="Available Beds"
                  type="number"
                  value={hospitalSettingsForm.availableBeds}
                  onChange={(e) =>
                    setHospitalSettingsForm((p) => ({ ...p, availableBeds: e.target.value }))
                  }
                  required
                />
              </div>
              <TextInput
                label="Address"
                value={hospitalSettingsForm.address}
                onChange={(e) =>
                  setHospitalSettingsForm((p) => ({ ...p, address: e.target.value }))
                }
                required
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={submitting}>
                  Save Hospital Settings
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Administrator Profile & Session Security" className="lg:col-span-1">
            <div className="space-y-3 text-xs">
              <p>
                <strong>Administrator:</strong> {user?.fullName}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Authorized Hospital:</strong> {activeHospital?.hospitalName || 'Scoped'}
              </p>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => void logoutAllSessions()}
                >
                  Revoke All Device Sessions
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Department Modal */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => {
          setShowDeptModal(false);
          setEditingDept(null);
        }}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Add Hospital Department'}
      >
        <form onSubmit={handleSaveDepartment} className="space-y-3">
          <TextInput
            label="Department Name"
            placeholder="e.g. Neurology"
            value={deptForm.name}
            onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <TextInput
            label="Department Code"
            placeholder="e.g. NEUR-01"
            value={deptForm.code}
            onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))}
          />
          <TextInput
            label="Floor / Wing Location"
            placeholder="e.g. Floor 3, Wing A"
            value={deptForm.floorLocation}
            onChange={(e) => setDeptForm((p) => ({ ...p, floorLocation: e.target.value }))}
          />
          <TextareaInput
            label="Description"
            value={deptForm.description}
            onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDeptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Doctor Modal */}
      <Modal
        isOpen={showDoctorModal}
        onClose={() => {
          setShowDoctorModal(false);
          setEditingDoctor(null);
        }}
        title={editingDoctor ? `Edit Doctor: ${editingDoctor.fullName}` : 'Add Doctor to Hospital'}
      >
        <form onSubmit={handleSaveDoctor} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Doctor Full Name"
              placeholder="Dr. Ananya Sharma"
              value={doctorForm.fullName}
              onChange={(e) => setDoctorForm((p) => ({ ...p, fullName: e.target.value }))}
              required
            />
            <TextInput
              label="Email Address"
              type="email"
              placeholder="doctor@hospital.org"
              value={doctorForm.email}
              onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))}
              disabled={Boolean(editingDoctor)}
              required
            />
            <TextInput
              label="Medical License Number"
              value={doctorForm.medicalLicenseNumber}
              onChange={(e) =>
                setDoctorForm((p) => ({ ...p, medicalLicenseNumber: e.target.value }))
              }
              disabled={Boolean(editingDoctor)}
              required
            />
            <TextInput
              label="Specialization"
              value={doctorForm.specialization}
              onChange={(e) => setDoctorForm((p) => ({ ...p, specialization: e.target.value }))}
              required
            />
            <TextInput
              label="Qualification"
              value={doctorForm.qualification}
              onChange={(e) => setDoctorForm((p) => ({ ...p, qualification: e.target.value }))}
              required
            />
            <SelectInput
              label="Assigned Department"
              value={doctorForm.departmentId}
              onChange={(e) => setDoctorForm((p) => ({ ...p, departmentId: e.target.value }))}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <TextInput
              label="Consultation Fee (INR)"
              type="number"
              value={doctorForm.consultationFee}
              onChange={(e) => setDoctorForm((p) => ({ ...p, consultationFee: e.target.value }))}
              required
            />
            <TextInput
              label="Slot Duration (Minutes)"
              type="number"
              value={doctorForm.slotDurationMinutes}
              onChange={(e) =>
                setDoctorForm((p) => ({ ...p, slotDurationMinutes: e.target.value }))
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDoctorModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingDoctor ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Doctor Availability Modal */}
      <Modal
        isOpen={Boolean(availabilityModalDoctor)}
        onClose={() => setAvailabilityModalDoctor(null)}
        title={
          availabilityModalDoctor
            ? `OPD Availability Slots: ${availabilityModalDoctor.fullName}`
            : 'Doctor Slots'
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {availabilitySlots.map((s) => (
            <div
              key={s.slotStartTime}
              className={`p-2.5 rounded-lg border text-center font-mono ${
                s.isAvailable
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {s.slotStartTime} – {s.slotEndTime}
              <div className="text-[10px] font-sans font-semibold mt-0.5">
                {s.isAvailable ? 'Available' : 'Booked'}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Staff Modal */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title="Provision Hospital Staff Account"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3">
          <TextInput
            label="Full Name"
            value={staffForm.fullName}
            onChange={(e) => setStaffForm((p) => ({ ...p, fullName: e.target.value }))}
            required
          />
          <TextInput
            label="Email Address"
            type="email"
            value={staffForm.email}
            onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <TextInput
            label="Phone Number"
            value={staffForm.phone}
            onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <SelectInput
            label="Staff Role"
            value={staffForm.roleCode}
            onChange={(e) =>
              setStaffForm((p) => ({ ...p, roleCode: e.target.value as RoleCodeType }))
            }
            options={[
              { value: 'NURSE', label: 'NURSE' },
              { value: 'RECEPTIONIST', label: 'RECEPTIONIST' },
              { value: 'PHARMACIST', label: 'PHARMACIST' },
              { value: 'LAB_TECHNICIAN', label: 'LAB_TECHNICIAN' },
              { value: 'ACCOUNTANT', label: 'ACCOUNTANT' },
            ]}
          />
          <TextInput
            label="Department"
            value={staffForm.department}
            onChange={(e) => setStaffForm((p) => ({ ...p, department: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowStaffModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule / Reschedule Appointment Modal */}
      <Modal
        isOpen={showBookAptModal}
        onClose={() => {
          setShowBookAptModal(false);
          setRescheduleTarget(null);
        }}
        title={rescheduleTarget ? 'Reschedule Appointment' : 'Schedule OPD Appointment'}
      >
        <form onSubmit={handleBookOrRescheduleAppointment} className="space-y-3">
          {!rescheduleTarget && (
            <SelectInput
              label="Patient"
              value={aptForm.patientId}
              onChange={(e) => setAptForm((p) => ({ ...p, patientId: e.target.value }))}
              options={patientsList.map((pat) => ({
                value: pat.id,
                label: `${pat.fullName} (${pat.globalPatientId})`,
              }))}
            />
          )}
          <SelectInput
            label="Attending Doctor"
            value={aptForm.doctorId}
            onChange={(e) => setAptForm((p) => ({ ...p, doctorId: e.target.value }))}
            options={doctors.map((d) => ({
              value: d.id,
              label: `${d.fullName} (${d.specialization})`,
            }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              type="date"
              label="Date"
              value={aptForm.appointmentDate}
              onChange={(e) => setAptForm((p) => ({ ...p, appointmentDate: e.target.value }))}
              required
            />
            <TextInput
              label="Start Time"
              placeholder="10:00"
              value={aptForm.slotStartTime}
              onChange={(e) => setAptForm((p) => ({ ...p, slotStartTime: e.target.value }))}
              required
            />
            <TextInput
              label="End Time"
              placeholder="10:30"
              value={aptForm.slotEndTime}
              onChange={(e) => setAptForm((p) => ({ ...p, slotEndTime: e.target.value }))}
              required
            />
          </div>
          <TextInput
            label="Reason for Visit"
            value={aptForm.reasonForVisit}
            onChange={(e) => setAptForm((p) => ({ ...p, reasonForVisit: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowBookAptModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {rescheduleTarget ? 'Confirm Reschedule' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateInvoiceModal}
        onClose={() => setShowCreateInvoiceModal(false)}
        title="Generate Hospital Invoice"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3">
          <SelectInput
            label="Patient"
            value={invoiceForm.patientId}
            onChange={(e) => setInvoiceForm((p) => ({ ...p, patientId: e.target.value }))}
            options={patientsList.map((pat) => ({
              value: pat.id,
              label: `${pat.fullName} (${pat.globalPatientId})`,
            }))}
          />
          <TextInput
            label="Service Description"
            value={invoiceForm.description}
            onChange={(e) => setInvoiceForm((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Quantity"
              type="number"
              value={invoiceForm.quantity}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
            <TextInput
              label="Unit Price (INR)"
              type="number"
              value={invoiceForm.unitPriceInr}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, unitPriceInr: e.target.value }))}
              required
            />
            <TextInput
              label="GST Tax Rate (%)"
              type="number"
              value={invoiceForm.taxRatePercent}
              onChange={(e) => setInvoiceForm((p) => ({ ...p, taxRatePercent: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateInvoiceModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Finalize Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={Boolean(showPaymentModal)}
        onClose={() => setShowPaymentModal(null)}
        title={
          showPaymentModal
            ? `Capture Payment: ${showPaymentModal.invoiceNumber}`
            : 'Capture Payment'
        }
      >
        {showPaymentModal && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <p className="text-xs text-[#718096]">
              Balance Due:{' '}
              <strong className="text-[#102F4D] dark:text-white">
                {formatCurrencyFromPaise(showPaymentModal.balanceDuePaise)}
              </strong>
            </p>
            <SelectInput
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              options={[
                { value: 'UPI', label: 'UPI Verified Transfer' },
                { value: 'CARD', label: 'POS Card Settlement' },
                { value: 'CASH', label: 'Cash Counter Receipt' },
                { value: 'NET_BANKING', label: 'Net Banking' },
              ]}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Verify &amp; Capture Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </ApplicationShell>
  );
};
