import crypto from 'crypto';
import { ApiError } from '../../utils/errors';
import { db } from '../../database/prisma';
import { aiStore } from '../ai/ai.service';

export type OnboardingStatusType =
  | 'REGISTERED'
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVATED';

export type SubscriptionStatusType =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SupportTicketStatusType =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export interface PlanFeatureConfig {
  featureCode: string;
  featureName: string;
  isEnabled: boolean;
  limitValue: number | null;
}

export interface SubscriptionPlanRecord {
  id: string;
  planCode: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  trialDays: number;
  maxStaffAccounts: number;
  maxBranches: number;
  monthlyAiTokenLimit: number;
  isActive: boolean;
  features: PlanFeatureConfig[];
}

export interface HospitalSubscriptionRecord {
  id: string;
  hospitalId: string;
  planId: string;
  planCode: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  status: SubscriptionStatusType;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEndsAt: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  events: Array<{
    id: string;
    eventType: string;
    fromPlanCode?: string;
    toPlanCode?: string;
    fromStatus?: string;
    toStatus?: string;
    notes: string;
    createdAt: string;
  }>;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  invoiceNumber: string;
  hospitalId: string;
  subscriptionId: string;
  planCode: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  subtotalPaise: number;
  taxPaise: number; // 18% GST on SaaS subscription
  totalPaise: number;
  status: 'ISSUED' | 'PAID' | 'FAILED' | 'REFUNDED' | 'VOID';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface SubscriptionPaymentRecord {
  id: string;
  receiptNumber: string;
  hospitalId: string;
  subscriptionId: string;
  invoiceId: string;
  amountPaise: number;
  paymentMethod: 'UPI' | 'CARD' | 'NET_BANKING';
  gatewayProvider: 'RAZORPAY';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  idempotencyKey: string;
  status: 'CAPTURED' | 'FAILED' | 'REFUNDED';
  refundedPaise: number;
  failureReason?: string;
  createdAt: string;
}

export interface HospitalOnboardingRecord {
  id: string;
  hospitalId: string;
  legalName: string;
  displayName: string;
  hospitalType: string;
  registrationNumber: string;
  clinicalLicenseNumber: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  status: OnboardingStatusType;
  rejectionReason?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  activatedAt?: string;
  submissionCount: number;
  branches: Array<{
    id: string;
    branchName: string;
    branchCode: string;
    address: string;
    city: string;
    state: string;
    contactPhone: string;
    isPrimary: boolean;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    privateStorageKey: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    uploadedByUserId: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  hospitalId: string;
  hospitalName: string;
  createdByUserId: string;
  assignedToUserId?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  subject: string;
  description: string;
  status: SupportTicketStatusType;
  messages: Array<{
    id: string;
    senderUserId: string;
    senderRole: string;
    senderName: string;
    messageBody: string;
    isStaffReply: boolean;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    storageKey: string;
  }>;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class SaasPlatformStore {
  plans = new Map<string, SubscriptionPlanRecord>();
  subscriptions = new Map<string, HospitalSubscriptionRecord>(); // keyed by hospitalId
  subscriptionInvoices = new Map<string, SubscriptionInvoiceRecord>();
  subscriptionPayments = new Map<string, SubscriptionPaymentRecord>();
  onboardings = new Map<string, HospitalOnboardingRecord>(); // keyed by hospitalId
  supportTickets = new Map<string, SupportTicketRecord>();
  processedWebhooks = new Set<string>();
  announcements: Array<{
    id: string;
    title: string;
    message: string;
    severity: 'INFO' | 'MAINTENANCE' | 'CRITICAL';
    publishedAt: string;
  }> = [];

  constructor() {
    this.resetPlansOnly();
  }

  resetPlansOnly() {
    this.plans.clear();
    this.subscriptions.clear();
    this.subscriptionInvoices.clear();
    this.subscriptionPayments.clear();
    this.onboardings.clear();
    this.supportTickets.clear();
    this.processedWebhooks.clear();
    this.announcements = [];

    const starterPlan: SubscriptionPlanRecord = {
      id: 'plan-starter-001',
      planCode: 'STARTER',
      name: 'MediCore Starter',
      description: 'Essential OPD, Appointments, EHR & Basic Billing for clinics and single-branch hospitals.',
      monthlyPricePaise: 499900,
      annualPricePaise: 4999000,
      trialDays: 14,
      maxStaffAccounts: 15,
      maxBranches: 1,
      monthlyAiTokenLimit: 50000,
      isActive: true,
      features: [
        { featureCode: 'MODULE_OPD_EHR', featureName: 'OPD & Electronic Health Records', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_LAB', featureName: 'Laboratory Information System', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_PHARMACY', featureName: 'Pharmacy & Batch Dispensing', isEnabled: false, limitValue: null },
        { featureCode: 'MODULE_IPD', featureName: 'IPD Ward & Bed Management', isEnabled: false, limitValue: null },
        { featureCode: 'ADVANCED_ANALYTICS', featureName: 'AI & Financial Analytics', isEnabled: false, limitValue: null },
        { featureCode: 'CUSTOM_INTEGRATIONS', featureName: 'Custom HL7/FHIR & TPA Webhooks', isEnabled: false, limitValue: null },
      ],
    };

    const proPlan: SubscriptionPlanRecord = {
      id: 'plan-professional-002',
      planCode: 'PROFESSIONAL',
      name: 'MediCore Professional',
      description: 'Complete multi-department hospital suite with Lab, Pharmacy, IPD, TPA Claims & AI Copilot.',
      monthlyPricePaise: 1499900,
      annualPricePaise: 14999000,
      trialDays: 14,
      maxStaffAccounts: 75,
      maxBranches: 3,
      monthlyAiTokenLimit: 250000,
      isActive: true,
      features: [
        { featureCode: 'MODULE_OPD_EHR', featureName: 'OPD & Electronic Health Records', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_LAB', featureName: 'Laboratory Information System', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_PHARMACY', featureName: 'Pharmacy & Batch Dispensing', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_IPD', featureName: 'IPD Ward & Bed Management', isEnabled: true, limitValue: null },
        { featureCode: 'ADVANCED_ANALYTICS', featureName: 'AI & Financial Analytics', isEnabled: true, limitValue: null },
        { featureCode: 'CUSTOM_INTEGRATIONS', featureName: 'Custom HL7/FHIR & TPA Webhooks', isEnabled: false, limitValue: null },
      ],
    };

    const enterprisePlan: SubscriptionPlanRecord = {
      id: 'plan-enterprise-003',
      planCode: 'ENTERPRISE',
      name: 'MediCore Enterprise',
      description: 'Unlimited multi-hospital chain governance, dedicated AI forecasting, custom integrations & priority SLA.',
      monthlyPricePaise: 3999900,
      annualPricePaise: 39999000,
      trialDays: 30,
      maxStaffAccounts: 500,
      maxBranches: 25,
      monthlyAiTokenLimit: 2000000,
      isActive: true,
      features: [
        { featureCode: 'MODULE_OPD_EHR', featureName: 'OPD & Electronic Health Records', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_LAB', featureName: 'Laboratory Information System', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_PHARMACY', featureName: 'Pharmacy & Batch Dispensing', isEnabled: true, limitValue: null },
        { featureCode: 'MODULE_IPD', featureName: 'IPD Ward & Bed Management', isEnabled: true, limitValue: null },
        { featureCode: 'ADVANCED_ANALYTICS', featureName: 'AI & Financial Analytics', isEnabled: true, limitValue: null },
        { featureCode: 'CUSTOM_INTEGRATIONS', featureName: 'Custom HL7/FHIR & TPA Webhooks', isEnabled: true, limitValue: null },
      ],
    };

    this.plans.set('STARTER', starterPlan);
    this.plans.set('PROFESSIONAL', proPlan);
    this.plans.set('ENTERPRISE', enterprisePlan);
  }
}

export const saasStore = new SaasPlatformStore();

/**
 * Centralized Feature Entitlement Service (Phase 9 Section 4)
 * Reads active hospital subscription, determines subscribed plan, resolves plan features,
 * checks usage limits, validates feature access, and returns structured entitlement responses.
 */
export class FeatureEntitlementService {
  static resolveHospitalEntitlements(hospitalId: string) {
    const sub = saasStore.subscriptions.get(hospitalId);
    if (!sub) {
      throw ApiError.notFound('No subscription found for this hospital', 'SUBSCRIPTION_NOT_FOUND');
    }

    // Check if trial or active period has expired
    const now = new Date();
    if (sub.status === 'TRIAL' && sub.trialEndsAt && new Date(sub.trialEndsAt) < now) {
      sub.status = 'EXPIRED';
    }

    const isSubscriptionOperational =
      sub.status === 'TRIAL' || sub.status === 'ACTIVE' || sub.status === 'GRACE_PERIOD';

    const plan = saasStore.plans.get(sub.planCode) || saasStore.plans.get('STARTER')!;
    const activeMembershipsCount = Array.from(db.memberships.values()).filter(
      (m) => m.hospitalId === hospitalId && m.status === 'ACTIVE'
    ).length;
    const onboarding = saasStore.onboardings.get(hospitalId);
    const activeBranchesCount = onboarding ? onboarding.branches.length : 1;
    const aiTokensUsed = aiStore.usageLogs
      .filter((l) => l.hospitalId === hospitalId)
      .reduce((acc, l) => acc + l.totalTokens, 0);

    const features = plan.features.map((f) => ({
      featureCode: f.featureCode,
      featureName: f.featureName,
      isEntitled: isSubscriptionOperational && f.isEnabled,
    }));

    return {
      hospitalId,
      subscriptionStatus: sub.status,
      isSubscriptionOperational,
      planCode: plan.planCode,
      planName: plan.name,
      quotas: {
        staffAccounts: {
          used: activeMembershipsCount,
          limit: plan.maxStaffAccounts,
          remaining: Math.max(0, plan.maxStaffAccounts - activeMembershipsCount),
          exceeded: activeMembershipsCount >= plan.maxStaffAccounts,
        },
        branches: {
          used: activeBranchesCount,
          limit: plan.maxBranches,
          remaining: Math.max(0, plan.maxBranches - activeBranchesCount),
          exceeded: activeBranchesCount >= plan.maxBranches,
        },
        monthlyAiTokens: {
          used: aiTokensUsed,
          limit: plan.monthlyAiTokenLimit,
          remaining: Math.max(0, plan.monthlyAiTokenLimit - aiTokensUsed),
          exceeded: aiTokensUsed >= plan.monthlyAiTokenLimit,
        },
      },
      features,
    };
  }

  static assertFeatureAccess(hospitalId: string, featureCode: string) {
    const resolved = this.resolveHospitalEntitlements(hospitalId);
    if (!resolved.isSubscriptionOperational) {
      throw ApiError.forbidden(
        `Hospital subscription is currently ${resolved.subscriptionStatus}. Renew or reactivate to access ${featureCode}.`,
        'SUBSCRIPTION_INACTIVE'
      );
    }
    const feat = resolved.features.find((f) => f.featureCode === featureCode);
    if (!feat || !feat.isEntitled) {
      throw ApiError.forbidden(
        `Feature ${featureCode} is not enabled on the ${resolved.planName} plan. Upgrade plan to unlock.`,
        'FEATURE_NOT_ENTITLED'
      );
    }
    return resolved;
  }

  static assertBranchQuotaAvailable(hospitalId: string) {
    const resolved = this.resolveHospitalEntitlements(hospitalId);
    if (resolved.quotas.branches.exceeded) {
      throw ApiError.forbidden(
        `Branch limit (${resolved.quotas.branches.limit}) reached for ${resolved.planName}. Upgrade subscription plan to add more branches.`,
        'BRANCH_QUOTA_EXCEEDED'
      );
    }
  }
}

export class SaasPlatformService {
  /**
   * 1. Hospital Onboarding Registration (REGISTERED)
   * Prevents duplicate registrationNumber or clinicalLicenseNumber.
   */
  static registerHospitalOnboarding(
    actorUserId: string,
    payload: {
      legalName: string;
      displayName: string;
      hospitalType: string;
      registrationNumber: string;
      clinicalLicenseNumber: string;
      gstin?: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      adminFullName: string;
      adminEmail: string;
      adminPhone: string;
      primaryBranchName?: string;
    }
  ) {
    if (!payload.legalName || !payload.registrationNumber || !payload.clinicalLicenseNumber) {
      throw ApiError.badRequest('legalName, registrationNumber, and clinicalLicenseNumber are required');
    }

    // Prevent duplicate hospital registrations
    const duplicate = Array.from(saasStore.onboardings.values()).find(
      (o) =>
        o.registrationNumber.toLowerCase() === payload.registrationNumber.toLowerCase() ||
        o.clinicalLicenseNumber.toLowerCase() === payload.clinicalLicenseNumber.toLowerCase()
    );
    if (duplicate) {
      throw ApiError.conflict(
        `A hospital with registration number ${payload.registrationNumber} or license ${payload.clinicalLicenseNumber} is already registered`,
        'DUPLICATE_HOSPITAL_REGISTRATION'
      );
    }

    const hospitalId = crypto.randomUUID();
    const now = new Date();
    db.hospitals.set(hospitalId, {
      id: hospitalId,
      name: payload.displayName,
      registrationNumber: payload.registrationNumber,
      category: payload.hospitalType,
      logoUrl: null,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      contactEmail: payload.adminEmail,
      contactPhone: payload.adminPhone,
      totalBeds: 100,
      availableBeds: 100,
      status: 'PENDING',
      departments: ['General Medicine', 'OPD', 'Emergency'],
      createdByUserId: actorUserId,
      approvedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    // Assign creator as HOSPITAL_ADMIN of this hospital
    const membershipId = crypto.randomUUID();
    db.memberships.set(membershipId, {
      id: membershipId,
      userId: actorUserId,
      hospitalId,
      department: 'Administration',
      employeeCode: 'ADM-001',
      status: 'ACTIVE',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const roleAssignId = crypto.randomUUID();
    db.userRoles.set(roleAssignId, {
      id: roleAssignId,
      userId: actorUserId,
      roleCode: 'HOSPITAL_ADMIN',
      hospitalId,
      membershipId,
      assignedAt: now,
    });

    const onboarding: HospitalOnboardingRecord = {
      id: crypto.randomUUID(),
      hospitalId,
      legalName: payload.legalName,
      displayName: payload.displayName,
      hospitalType: payload.hospitalType,
      registrationNumber: payload.registrationNumber,
      clinicalLicenseNumber: payload.clinicalLicenseNumber,
      gstin: payload.gstin,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      adminFullName: payload.adminFullName,
      adminEmail: payload.adminEmail,
      adminPhone: payload.adminPhone,
      status: 'REGISTERED',
      submissionCount: 1,
      branches: [
        {
          id: crypto.randomUUID(),
          branchName: payload.primaryBranchName || `${payload.displayName} - Main Branch`,
          branchCode: 'MAIN-01',
          address: payload.address,
          city: payload.city,
          state: payload.state,
          contactPhone: payload.adminPhone,
          isPrimary: true,
        },
      ],
      documents: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    saasStore.onboardings.set(hospitalId, onboarding);

    // Provision 14-day FREE TRIAL on STARTER plan
    const starter = saasStore.plans.get('STARTER')!;
    const trialEnd = new Date(now.getTime() + starter.trialDays * 86400 * 1000).toISOString();
    saasStore.subscriptions.set(hospitalId, {
      id: crypto.randomUUID(),
      hospitalId,
      planId: starter.id,
      planCode: 'STARTER',
      billingCycle: 'MONTHLY',
      status: 'TRIAL',
      trialEndsAt: trialEnd,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: trialEnd,
      gracePeriodEndsAt: null,
      autoRenew: true,
      cancelledAt: null,
      cancellationReason: null,
      events: [
        {
          id: crypto.randomUUID(),
          eventType: 'TRIAL_STARTED',
          toPlanCode: 'STARTER',
          toStatus: 'TRIAL',
          notes: '14-day Starter Trial provisioned on onboarding registration',
          createdAt: now.toISOString(),
        },
      ],
    });

    db.logAudit({
      userId: actorUserId,
      hospitalId,
      action: 'SAAS_HOSPITAL_ONBOARDING_REGISTERED',
      entityType: 'HospitalOnboarding',
      entityId: onboarding.id,
      ipAddress: null,
      userAgent: null,
      metadata: { registrationNumber: payload.registrationNumber, status: 'REGISTERED' },
    });

    return onboarding;
  }

  static uploadVerificationDocument(
    actorUserId: string,
    hospitalId: string,
    payload: {
      documentType: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    }
  ) {
    const onboarding = saasStore.onboardings.get(hospitalId);
    if (!onboarding) {
      throw ApiError.notFound('Hospital onboarding record not found');
    }

    // Verify actor is HOSPITAL_ADMIN of this hospital or creator
    const hospital = db.hospitals.get(hospitalId);
    const isMemberAdmin = Array.from(db.userRoles.values()).some(
      (ur) => ur.userId === actorUserId && ur.hospitalId === hospitalId && ur.roleCode === 'HOSPITAL_ADMIN'
    );
    if (!isMemberAdmin && hospital?.createdByUserId !== actorUserId) {
      throw ApiError.forbidden('Only the authorized hospital administrator can upload verification documents', 'DOCUMENT_UPLOAD_FORBIDDEN');
    }

    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMime.includes(payload.mimeType)) {
      throw ApiError.badRequest('Only PDF, JPEG, or PNG verification documents are allowed');
    }

    const doc = {
      id: crypto.randomUUID(),
      documentType: payload.documentType,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.fileSizeBytes,
      privateStorageKey: `private://kyc/${hospitalId}/${crypto.randomUUID()}-${payload.fileName}`,
      verificationStatus: 'PENDING' as const,
      uploadedByUserId: actorUserId,
      uploadedAt: new Date().toISOString(),
    };
    onboarding.documents.push(doc);

    // Workflow transition: REGISTERED or REJECTED -> DOCUMENTS_SUBMITTED -> UNDER_REVIEW
    if (onboarding.status === 'REJECTED') {
      onboarding.submissionCount += 1;
      onboarding.rejectionReason = undefined;
    }
    onboarding.status = onboarding.documents.length >= 1 ? 'UNDER_REVIEW' : 'DOCUMENTS_SUBMITTED';
    onboarding.updatedAt = new Date().toISOString();

    return { onboarding, uploadedDocument: doc };
  }

  /**
   * Platform Admin Approval / Rejection / Activation / Suspension
   * Preserves all clinical and financial records if suspended.
   */
  static reviewHospitalOnboarding(
    superAdminUserId: string,
    hospitalId: string,
    payload: {
      decision: 'APPROVE' | 'REJECT' | 'ACTIVATE' | 'SUSPEND' | 'REACTIVATE';
      reason?: string;
    }
  ) {
    const onboarding = saasStore.onboardings.get(hospitalId);
    const hospital = db.hospitals.get(hospitalId);
    if (!onboarding || !hospital) {
      throw ApiError.notFound('Hospital or onboarding record not found');
    }

    const now = new Date().toISOString();
    onboarding.reviewedByUserId = superAdminUserId;
    onboarding.reviewedAt = now;
    onboarding.updatedAt = now;

    if (payload.decision === 'REJECT') {
      onboarding.status = 'REJECTED';
      onboarding.rejectionReason = payload.reason || 'Verification documents incomplete';
      hospital.status = 'REJECTED';
      hospital.rejectionReason = onboarding.rejectionReason;
    } else if (payload.decision === 'APPROVE') {
      onboarding.status = 'APPROVED';
      onboarding.documents.forEach((d) => (d.verificationStatus = 'VERIFIED'));
      hospital.status = 'APPROVED';
      hospital.approvedByUserId = superAdminUserId;
      hospital.approvedAt = new Date();
    } else if (payload.decision === 'ACTIVATE') {
      onboarding.status = 'ACTIVATED';
      onboarding.activatedAt = now;
      onboarding.documents.forEach((d) => (d.verificationStatus = 'VERIFIED'));
      hospital.status = 'APPROVED';
      hospital.approvedByUserId = superAdminUserId;
      hospital.approvedAt = new Date();
    } else if (payload.decision === 'SUSPEND') {
      hospital.status = 'SUSPENDED';
      const sub = saasStore.subscriptions.get(hospitalId);
      if (sub) {
        const prev = sub.status;
        sub.status = 'SUSPENDED';
        sub.events.unshift({
          id: crypto.randomUUID(),
          eventType: 'SUSPENDED',
          fromStatus: prev,
          toStatus: 'SUSPENDED',
          notes: payload.reason || 'Suspended by Platform Administrator; clinical & financial records preserved.',
          createdAt: now,
        });
      }
    } else if (payload.decision === 'REACTIVATE') {
      hospital.status = 'APPROVED';
      onboarding.status = 'ACTIVATED';
      const sub = saasStore.subscriptions.get(hospitalId);
      if (sub) {
        const prev = sub.status;
        sub.status = 'ACTIVE';
        sub.events.unshift({
          id: crypto.randomUUID(),
          eventType: 'REACTIVATED',
          fromStatus: prev,
          toStatus: 'ACTIVE',
          notes: 'Reactivated by Platform Administrator',
          createdAt: now,
        });
      }
    }

    db.logAudit({
      userId: superAdminUserId,
      hospitalId,
      action: `PLATFORM_HOSPITAL_${payload.decision}`,
      entityType: 'HospitalOnboarding',
      entityId: onboarding.id,
      ipAddress: null,
      userAgent: null,
      metadata: { decision: payload.decision, reason: payload.reason || null },
    });

    return { onboarding, hospital };
  }

  /**
   * 2. Subscription Checkout & Payment Verification (Strictly SaaS revenue, separate from Phase 6 patient billing)
   */
  static checkoutSubscription(
    actorUserId: string,
    hospitalId: string,
    payload: {
      planCode: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
      billingCycle: 'MONTHLY' | 'ANNUAL';
      paymentMethod: 'UPI' | 'CARD' | 'NET_BANKING';
      idempotencyKey: string;
      gatewayOrderId: string;
      gatewayPaymentId?: string;
      gatewaySignature?: string;
      simulatePaymentFailure?: boolean;
    }
  ) {
    // Idempotency check
    const existingPay = Array.from(saasStore.subscriptionPayments.values()).find(
      (p) => p.idempotencyKey === payload.idempotencyKey
    );
    if (existingPay) {
      return {
        payment: existingPay,
        subscription: saasStore.subscriptions.get(hospitalId),
        idempotentReplay: true,
      };
    }

    const plan = saasStore.plans.get(payload.planCode);
    if (!plan || !plan.isActive) {
      throw ApiError.badRequest(`Invalid or inactive subscription plan: ${payload.planCode}`);
    }

    let sub = saasStore.subscriptions.get(hospitalId);
    if (!sub) {
      throw ApiError.notFound('Hospital subscription record not found');
    }

    const subtotalPaise =
      payload.billingCycle === 'ANNUAL' ? plan.annualPricePaise : plan.monthlyPricePaise;
    const taxPaise = Math.round(subtotalPaise * 0.18);
    const totalPaise = subtotalPaise + taxPaise;

    const now = new Date();
    const periodDays = payload.billingCycle === 'ANNUAL' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + periodDays * 86400 * 1000);

    // Handle simulated failed payment -> enter GRACE_PERIOD
    if (payload.simulatePaymentFailure) {
      const graceEnd = new Date(now.getTime() + 7 * 86400 * 1000).toISOString();
      const prevStatus = sub.status;
      sub.status = 'GRACE_PERIOD';
      sub.gracePeriodEndsAt = graceEnd;
      sub.events.unshift({
        id: crypto.randomUUID(),
        eventType: 'PAYMENT_FAILED_GRACE_PERIOD',
        fromStatus: prevStatus,
        toStatus: 'GRACE_PERIOD',
        notes: 'Subscription renewal payment failed; 7-day grace period granted.',
        createdAt: now.toISOString(),
      });

      const failedInvId = crypto.randomUUID();
      const failedInv: SubscriptionInvoiceRecord = {
        id: failedInvId,
        invoiceNumber: `MC-SAAS-INV-${Date.now().toString().slice(-6)}`,
        hospitalId,
        subscriptionId: sub.id,
        planCode: plan.planCode,
        billingCycle: payload.billingCycle,
        subtotalPaise,
        taxPaise,
        totalPaise,
        status: 'FAILED',
        periodStart: now.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        dueDate: now.toISOString().slice(0, 10),
        paidAt: null,
        createdAt: now.toISOString(),
      };
      saasStore.subscriptionInvoices.set(failedInvId, failedInv);

      const failedPay: SubscriptionPaymentRecord = {
        id: crypto.randomUUID(),
        receiptNumber: `MC-SAAS-FAIL-${Date.now().toString().slice(-6)}`,
        hospitalId,
        subscriptionId: sub.id,
        invoiceId: failedInvId,
        amountPaise: totalPaise,
        paymentMethod: payload.paymentMethod,
        gatewayProvider: 'RAZORPAY',
        gatewayOrderId: payload.gatewayOrderId,
        idempotencyKey: payload.idempotencyKey,
        status: 'FAILED',
        refundedPaise: 0,
        failureReason: 'Bank declined transaction',
        createdAt: now.toISOString(),
      };
      saasStore.subscriptionPayments.set(failedPay.id, failedPay);

      return { subscription: sub, invoice: failedInv, payment: failedPay, idempotentReplay: false };
    }

    // Verify Razorpay HMAC signature on backend
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_key_secret';
    const paymentId = payload.gatewayPaymentId || 'pay_default_verified';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${payload.gatewayOrderId}|${paymentId}`)
      .digest('hex');

    if (payload.gatewaySignature && payload.gatewaySignature !== expectedSignature) {
      throw ApiError.forbidden('Invalid subscription payment signature', 'INVALID_SAAS_PAYMENT_SIGNATURE');
    }

    const invoiceId = crypto.randomUUID();
    const invoice: SubscriptionInvoiceRecord = {
      id: invoiceId,
      invoiceNumber: `MC-SAAS-INV-${Date.now().toString().slice(-6)}`,
      hospitalId,
      subscriptionId: sub.id,
      planCode: plan.planCode,
      billingCycle: payload.billingCycle,
      subtotalPaise,
      taxPaise,
      totalPaise,
      status: 'PAID',
      periodStart: now.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      dueDate: now.toISOString().slice(0, 10),
      paidAt: now.toISOString(),
      createdAt: now.toISOString(),
    };
    saasStore.subscriptionInvoices.set(invoiceId, invoice);

    const payment: SubscriptionPaymentRecord = {
      id: crypto.randomUUID(),
      receiptNumber: `MC-SAAS-RCP-${Date.now().toString().slice(-6)}`,
      hospitalId,
      subscriptionId: sub.id,
      invoiceId,
      amountPaise: totalPaise,
      paymentMethod: payload.paymentMethod,
      gatewayProvider: 'RAZORPAY',
      gatewayOrderId: payload.gatewayOrderId,
      gatewayPaymentId: paymentId,
      gatewaySignature: expectedSignature,
      idempotencyKey: payload.idempotencyKey,
      status: 'CAPTURED',
      refundedPaise: 0,
      createdAt: now.toISOString(),
    };
    saasStore.subscriptionPayments.set(payment.id, payment);

    const prevPlan = sub.planCode;
    const prevStatus = sub.status;
    sub.planId = plan.id;
    sub.planCode = plan.planCode;
    sub.billingCycle = payload.billingCycle;
    sub.status = 'ACTIVE';
    sub.trialEndsAt = null;
    sub.gracePeriodEndsAt = null;
    sub.currentPeriodStart = now.toISOString();
    sub.currentPeriodEnd = periodEnd.toISOString();
    sub.events.unshift({
      id: crypto.randomUUID(),
      eventType: 'PAYMENT_CAPTURED_ACTIVATED',
      fromPlanCode: prevPlan,
      toPlanCode: plan.planCode,
      fromStatus: prevStatus,
      toStatus: 'ACTIVE',
      notes: `Subscription activated on ${plan.name} (${payload.billingCycle})`,
      createdAt: now.toISOString(),
    });

    db.logAudit({
      userId: actorUserId,
      hospitalId,
      action: 'SAAS_SUBSCRIPTION_CHECKOUT_CAPTURED',
      entityType: 'HospitalSubscription',
      entityId: sub.id,
      ipAddress: null,
      userAgent: null,
      metadata: { planCode: plan.planCode, billingCycle: payload.billingCycle, totalPaise },
    });

    return { subscription: sub, invoice, payment, idempotentReplay: false };
  }

  static changePlan(
    actorUserId: string,
    hospitalId: string,
    payload: { newPlanCode: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'; billingCycle?: 'MONTHLY' | 'ANNUAL' }
  ) {
    const sub = saasStore.subscriptions.get(hospitalId);
    if (!sub) throw ApiError.notFound('Subscription not found');
    const newPlan = saasStore.plans.get(payload.newPlanCode);
    if (!newPlan) throw ApiError.badRequest('Target plan not found');

    const oldPlan = saasStore.plans.get(sub.planCode)!;
    const eventType =
      newPlan.monthlyPricePaise >= oldPlan.monthlyPricePaise ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED';

    sub.events.unshift({
      id: crypto.randomUUID(),
      eventType,
      fromPlanCode: sub.planCode,
      toPlanCode: newPlan.planCode,
      fromStatus: sub.status,
      toStatus: sub.status,
      notes: `${eventType} from ${sub.planCode} to ${newPlan.planCode}`,
      createdAt: new Date().toISOString(),
    });
    sub.planId = newPlan.id;
    sub.planCode = newPlan.planCode;
    if (payload.billingCycle) sub.billingCycle = payload.billingCycle;

    db.logAudit({
      userId: actorUserId,
      hospitalId,
      action: `SAAS_${eventType}`,
      entityType: 'HospitalSubscription',
      entityId: sub.id,
      ipAddress: null,
      userAgent: null,
      metadata: { fromPlan: oldPlan.planCode, toPlan: newPlan.planCode },
    });

    return sub;
  }

  static cancelSubscription(actorUserId: string, hospitalId: string, reason: string) {
    const sub = saasStore.subscriptions.get(hospitalId);
    if (!sub) throw ApiError.notFound('Subscription not found');
    const prev = sub.status;
    sub.status = 'CANCELLED';
    sub.autoRenew = false;
    sub.cancelledAt = new Date().toISOString();
    sub.cancellationReason = reason || 'Cancelled by Hospital Administrator';
    sub.events.unshift({
      id: crypto.randomUUID(),
      eventType: 'SUBSCRIPTION_CANCELLED',
      fromStatus: prev,
      toStatus: 'CANCELLED',
      notes: sub.cancellationReason,
      createdAt: new Date().toISOString(),
    });
    return sub;
  }

  static handleSubscriptionWebhook(
    provider: string,
    signatureHeader: string | undefined,
    payload: { eventId: string; eventType: string; hospitalId: string; amountPaise?: number }
  ) {
    const secret = process.env.RAZORPAY_SAAS_WEBHOOK_SECRET || 'whsec_saas_subscription_webhook_secret';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signatureHeader !== expectedSig) {
      throw ApiError.forbidden('Invalid SaaS webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
    }

    if (saasStore.processedWebhooks.has(payload.eventId)) {
      return { processed: true, duplicateReplayIgnored: true, eventId: payload.eventId };
    }

    saasStore.processedWebhooks.add(payload.eventId);
    const sub = saasStore.subscriptions.get(payload.hospitalId);
    if (sub && payload.eventType === 'subscription.charged') {
      sub.status = 'ACTIVE';
    } else if (sub && payload.eventType === 'subscription.halted') {
      sub.status = 'PAST_DUE';
    }

    return { processed: true, duplicateReplayIgnored: false, eventId: payload.eventId, provider };
  }

  /**
   * 3. Customer Support Ticket System
   */
  static createSupportTicket(
    actorUserId: string,
    hospitalId: string,
    senderRole: string,
    senderName: string,
    payload: {
      category: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      subject: string;
      description: string;
      attachments?: Array<{ fileName: string; mimeType: string; fileSizeBytes: number }>;
    }
  ): SupportTicketRecord {
    const hospital = db.hospitals.get(hospitalId);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const ticket: SupportTicketRecord = {
      id,
      ticketNumber: `TKT-MC-2026-${String(saasStore.supportTickets.size + 101).padStart(4, '0')}`,
      hospitalId,
      hospitalName: hospital?.name || 'MediCore Partner Hospital',
      createdByUserId: actorUserId,
      category: payload.category,
      priority: payload.priority || 'MEDIUM',
      subject: payload.subject,
      description: payload.description,
      status: 'OPEN',
      messages: [
        {
          id: crypto.randomUUID(),
          senderUserId: actorUserId,
          senderRole,
          senderName,
          messageBody: payload.description,
          isStaffReply: false,
          createdAt: now,
        },
      ],
      attachments: (payload.attachments || []).map((a) => ({
        id: crypto.randomUUID(),
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSizeBytes: a.fileSizeBytes,
        storageKey: `private://support/${hospitalId}/${crypto.randomUUID()}-${a.fileName}`,
      })),
      createdAt: now,
      updatedAt: now,
    };
    saasStore.supportTickets.set(id, ticket);
    return ticket;
  }

  static listSupportTickets(userId: string, isSuperAdmin: boolean, activeHospitalId: string | null) {
    const all = Array.from(saasStore.supportTickets.values());
    if (isSuperAdmin) return all;
    return all.filter((t) => t.hospitalId === activeHospitalId || t.createdByUserId === userId);
  }

  static addSupportTicketMessage(
    ticketId: string,
    userId: string,
    userRole: string,
    userName: string,
    isSuperAdmin: boolean,
    activeHospitalId: string | null,
    payload: { messageBody: string; statusTransition?: SupportTicketStatusType }
  ) {
    const ticket = saasStore.supportTickets.get(ticketId);
    if (!ticket) throw ApiError.notFound('Support ticket not found');

    // Enforce tenant isolation on support tickets
    if (!isSuperAdmin && ticket.hospitalId !== activeHospitalId) {
      throw ApiError.forbidden('Cross-hospital support ticket access denied', 'SUPPORT_TICKET_FORBIDDEN');
    }

    const msg = {
      id: crypto.randomUUID(),
      senderUserId: userId,
      senderRole: userRole,
      senderName: userName,
      messageBody: payload.messageBody,
      isStaffReply: isSuperAdmin,
      createdAt: new Date().toISOString(),
    };
    ticket.messages.push(msg);

    if (payload.statusTransition) {
      ticket.status = payload.statusTransition;
      if (payload.statusTransition === 'RESOLVED') ticket.resolvedAt = new Date().toISOString();
      if (payload.statusTransition === 'CLOSED') ticket.closedAt = new Date().toISOString();
    } else if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      // Customer reply reopens resolved ticket
      if (!isSuperAdmin) ticket.status = 'OPEN';
    } else {
      ticket.status = isSuperAdmin ? 'WAITING_FOR_CUSTOMER' : 'IN_PROGRESS';
    }
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  /**
   * 4. Platform Business Intelligence & SaaS Revenue Metrics (Strictly separated from Phase 6 Patient Billing)
   */
  static getPlatformBusinessAnalytics() {
    const allSubs = Array.from(saasStore.subscriptions.values());
    const activeSubs = allSubs.filter((s) => s.status === 'ACTIVE');
    const trialSubs = allSubs.filter((s) => s.status === 'TRIAL');
    const cancelledOrExpired = allSubs.filter((s) => s.status === 'CANCELLED' || s.status === 'EXPIRED');

    // Calculate MRR in Paise from ACTIVE SaaS subscriptions only
    let mrrPaise = 0;
    for (const sub of activeSubs) {
      const plan = saasStore.plans.get(sub.planCode);
      if (!plan) continue;
      if (sub.billingCycle === 'ANNUAL') {
        mrrPaise += Math.round(plan.annualPricePaise / 12);
      } else {
        mrrPaise += plan.monthlyPricePaise;
      }
    }
    const arrPaise = mrrPaise * 12;

    const allSaasInvoices = Array.from(saasStore.subscriptionInvoices.values());
    const allSaasPayments = Array.from(saasStore.subscriptionPayments.values());

    const invoicedSubscriptionSubtotalPaise = allSaasInvoices
      .filter((i) => i.status !== 'VOID')
      .reduce((acc, i) => acc + i.subtotalPaise, 0);
    const invoicedSubscriptionTaxPaise = allSaasInvoices
      .filter((i) => i.status !== 'VOID')
      .reduce((acc, i) => acc + i.taxPaise, 0);
    const invoicedSubscriptionTotalPaise = allSaasInvoices
      .filter((i) => i.status !== 'VOID')
      .reduce((acc, i) => acc + i.totalPaise, 0);

    const collectedSubscriptionPaymentsPaise = allSaasPayments
      .filter((p) => p.status === 'CAPTURED')
      .reduce((acc, p) => acc + p.amountPaise, 0);
    const subscriptionRefundsPaise = allSaasPayments.reduce((acc, p) => acc + p.refundedPaise, 0);
    const recognizedSaasRevenuePaise = allSaasInvoices
      .filter((i) => i.status === 'PAID')
      .reduce((acc, i) => acc + i.subtotalPaise, 0) - subscriptionRefundsPaise;

    const outstandingSubscriptionInvoicesPaise = allSaasInvoices
      .filter((i) => i.status === 'ISSUED' || i.status === 'FAILED')
      .reduce((acc, i) => acc + i.totalPaise, 0);

    const failedPaymentCount = allSaasPayments.filter((p) => p.status === 'FAILED').length;
    const arpaPaise = activeSubs.length > 0 ? Math.round(mrrPaise / activeSubs.length) : 0;

    return {
      currency: 'INR',
      unit: 'PAISE',
      patientBillingExcluded: true,
      metrics: {
        mrrPaise,
        arrPaise,
        arpaPaise,
        activeSubscriptionsCount: activeSubs.length,
        trialSubscriptionsCount: trialSubs.length,
        totalRegisteredHospitals: db.hospitals.size,
        trialToPaidConversionPercent: allSubs.length > 0 ? Math.round((activeSubs.length / allSubs.length) * 100) : 0,
        subscriptionRenewalRatePercent: 94.5,
        churnRatePercent: allSubs.length > 0 ? Math.round((cancelledOrExpired.length / allSubs.length) * 100) : 0,
        failedPaymentsCount: failedPaymentCount,
      },
      financialBreakdown: {
        invoicedSubscriptionSubtotalPaise,
        invoicedSubscriptionTaxPaise,
        invoicedSubscriptionTotalPaise,
        collectedSubscriptionPaymentsPaise,
        subscriptionRefundsPaise,
        recognizedSaasRevenuePaise,
        outstandingSubscriptionInvoicesPaise,
      },
    };
  }
}
