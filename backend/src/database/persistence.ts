import fs from 'fs';
import path from 'path';
import { db } from './prisma';
import { clinicalStore } from '../modules/clinical/clinical.service';
import { opsStore } from '../modules/operations/operations.service';
import { directoryStore } from '../modules/directory/directory.service';
import { securityStore } from '../modules/security/security.service';
import { saasStore } from '../modules/saas/saas.service';
import { aiStore } from '../modules/ai/ai.service';

const STORAGE_BASE_DIR = path.resolve(__dirname, '../../storage');
const DB_SNAPSHOT_FILENAME = 'medicore-unified-db.json';
const SNAPSHOT_VERSION = 1;

interface SerializedTaggedValue {
  __mcType: 'Date' | 'Map' | 'Set';
  value: unknown;
}

function isTaggedValue(val: unknown): val is SerializedTaggedValue {
  return (
    typeof val === 'object' &&
    val !== null &&
    '__mcType' in val &&
    'value' in val &&
    ((val as SerializedTaggedValue).__mcType === 'Date' ||
      (val as SerializedTaggedValue).__mcType === 'Map' ||
      (val as SerializedTaggedValue).__mcType === 'Set')
  );
}

function encodeValue(val: unknown): unknown {
  if (val instanceof Date) {
    return { __mcType: 'Date', value: val.toISOString() };
  }
  if (val instanceof Map) {
    return {
      __mcType: 'Map',
      value: Array.from(val.entries()).map(([k, v]) => [encodeValue(k), encodeValue(v)]),
    };
  }
  if (val instanceof Set) {
    return {
      __mcType: 'Set',
      value: Array.from(val.values()).map((v) => encodeValue(v)),
    };
  }
  if (Array.isArray(val)) {
    return val.map((item) => encodeValue(item));
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        out[k] = encodeValue(v);
      }
    }
    return out;
  }
  return val;
}

function decodeValue(val: unknown): unknown {
  if (isTaggedValue(val)) {
    if (val.__mcType === 'Date' && typeof val.value === 'string') {
      return new Date(val.value);
    }
    if (val.__mcType === 'Map' && Array.isArray(val.value)) {
      const map = new Map<unknown, unknown>();
      for (const entry of val.value) {
        if (Array.isArray(entry) && entry.length === 2) {
          map.set(decodeValue(entry[0]), decodeValue(entry[1]));
        }
      }
      return map;
    }
    if (val.__mcType === 'Set' && Array.isArray(val.value)) {
      const set = new Set<unknown>();
      for (const item of val.value) {
        set.add(decodeValue(item));
      }
      return set;
    }
  }
  if (Array.isArray(val)) {
    return val.map((item) => decodeValue(item));
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return val;
}

function replaceMap<K, V>(target: Map<K, V>, source: unknown) {
  if (!(source instanceof Map)) return;
  target.clear();
  for (const [k, v] of source.entries()) {
    target.set(k as K, v as V);
  }
}

function replaceSet<T>(target: Set<T>, source: unknown) {
  if (!(source instanceof Set)) return;
  target.clear();
  for (const v of source.values()) {
    target.add(v as T);
  }
}

function resolveSafeSnapshotPath(customPath?: string): string {
  const targetDir = customPath ? path.dirname(path.resolve(customPath)) : STORAGE_BASE_DIR;
  const resolved = customPath
    ? path.resolve(customPath)
    : path.resolve(STORAGE_BASE_DIR, DB_SNAPSHOT_FILENAME);

  if (!customPath) {
    const basePrefix = STORAGE_BASE_DIR.endsWith(path.sep)
      ? STORAGE_BASE_DIR
      : `${STORAGE_BASE_DIR}${path.sep}`;
    if (!resolved.startsWith(basePrefix)) {
      throw new Error('Resolved database snapshot path escaped confined storage directory');
    }
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  }
  return resolved;
}

let flushTimer: NodeJS.Timeout | null = null;
let lastPersistedAt: string | null = null;
let persistedBootHydrated = false;

export function isPersistentStorageEnabled(): boolean {
  if (process.env.MEDICORE_DISABLE_DISK_PERSISTENCE === 'true') return false;
  if (process.env.NODE_ENV === 'test' && process.env.MEDICORE_ENABLE_TEST_PERSISTENCE !== 'true') {
    return false;
  }
  return true;
}

export function getPersistenceStatus() {
  const enabled = isPersistentStorageEnabled();
  const snapshotPath = path.resolve(STORAGE_BASE_DIR, DB_SNAPSHOT_FILENAME);
  const existsOnDisk = enabled && fs.existsSync(snapshotPath);
  return {
    enabled,
    hydratedFromDisk: persistedBootHydrated,
    snapshotOnDisk: existsOnDisk,
    lastPersistedAt,
    engine: 'UNIFIED_RELATIONAL_STORE_WITH_ATOMIC_PERSISTENCE',
  };
}

export function buildDatabaseSnapshotPayload() {
  return encodeValue({
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    core: {
      users: db.users,
      hospitals: db.hospitals,
      memberships: db.memberships,
      userRoles: db.userRoles,
      refreshTokens: db.refreshTokens,
      emailVerifications: db.emailVerifications,
      passwordResets: db.passwordResets,
      otpLoginChallenges: db.otpLoginChallenges,
      phoneOtps: db.phoneOtps,
      invitations: db.invitations,
      patientProfiles: db.patientProfiles,
      patientAddresses: db.patientAddresses,
      emergencyContacts: db.emergencyContacts,
      patientHealthInfo: db.patientHealthInfo,
      patientProfilePhotos: db.patientProfilePhotos,
      medicationReminders: db.medicationReminders,
      medicationDoseLogs: db.medicationDoseLogs,
      auditLogs: db.auditLogs,
    },
    clinical: {
      patients: clinicalStore.patients,
      departments: clinicalStore.departments,
      doctors: clinicalStore.doctors,
      doctorAvailabilities: clinicalStore.doctorAvailabilities,
      doctorBlockedTimes: clinicalStore.doctorBlockedTimes,
      appointments: clinicalStore.appointments,
      encounters: clinicalStore.encounters,
      vitals: clinicalStore.vitals,
      allergies: clinicalStore.allergies,
      prescriptions: clinicalStore.prescriptions,
      documents: clinicalStore.documents,
      signedDownloadTokens: clinicalStore.signedDownloadTokens,
    },
    operations: {
      labOrders: opsStore.labOrders,
      medicineBatches: opsStore.medicineBatches,
      beds: opsStore.beds,
      invoices: opsStore.invoices,
      payments: opsStore.payments,
      paymentReceipts: opsStore.paymentReceipts,
      refunds: opsStore.refunds,
      claims: opsStore.claims,
      expenses: opsStore.expenses,
      processedWebhookEvents: opsStore.processedWebhookEvents,
    },
    directory: {
      records: directoryStore.records,
      importHistory: directoryStore.importHistory,
    },
    security: {
      mfaSecrets: securityStore.mfaSecrets,
      devices: securityStore.devices,
      preferences: securityStore.preferences,
      outbox: securityStore.outbox,
      messagingLogs: securityStore.messagingLogs,
      metrics: securityStore.metrics,
    },
    saas: {
      plans: saasStore.plans,
      subscriptions: saasStore.subscriptions,
      subscriptionInvoices: saasStore.subscriptionInvoices,
      subscriptionPayments: saasStore.subscriptionPayments,
      onboardings: saasStore.onboardings,
      supportTickets: saasStore.supportTickets,
      processedWebhooks: saasStore.processedWebhooks,
      announcements: saasStore.announcements,
    },
    ai: {
      consents: aiStore.consents,
      conversations: aiStore.conversations,
      clinicalDrafts: aiStore.clinicalDrafts,
      usageLogs: aiStore.usageLogs,
      feedbacks: aiStore.feedbacks,
    },
  });
}

export function persistDatabaseNow(customPath?: string): boolean {
  if (!customPath && !isPersistentStorageEnabled()) return false;
  try {
    const targetPath = resolveSafeSnapshotPath(customPath);
    const tempPath = `${targetPath}.${process.pid}.tmp`;
    const serialized = JSON.stringify(buildDatabaseSnapshotPayload());
    fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, targetPath);
    lastPersistedAt = new Date().toISOString();
    return true;
  } catch (err) {
    console.error('[MediCore DB Persistence] Failed to flush unified database snapshot:', err);
    return false;
  }
}

export function schedulePersistDatabase(delayMs = 150): void {
  if (!isPersistentStorageEnabled()) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    persistDatabaseNow();
  }, delayMs);
  flushTimer.unref?.();
}

export function loadPersistedDatabase(customPath?: string): boolean {
  if (!customPath && !isPersistentStorageEnabled()) return false;
  try {
    const targetPath = resolveSafeSnapshotPath(customPath);
    if (!fs.existsSync(targetPath)) {
      return false;
    }

    const raw = fs.readFileSync(targetPath, 'utf8');
    if (!raw.trim()) return false;

    const parsed = decodeValue(JSON.parse(raw)) as Record<string, any>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== SNAPSHOT_VERSION) {
      return false;
    }

    const core = parsed.core || {};
    replaceMap(db.users, core.users);
    replaceMap(db.hospitals, core.hospitals);
    replaceMap(db.memberships, core.memberships);
    replaceMap(db.userRoles, core.userRoles);
    replaceMap(db.refreshTokens, core.refreshTokens);
    replaceMap(db.emailVerifications, core.emailVerifications);
    replaceMap(db.passwordResets, core.passwordResets);
    replaceMap(db.otpLoginChallenges, core.otpLoginChallenges);
    replaceMap(db.phoneOtps, core.phoneOtps);
    replaceMap(db.invitations, core.invitations);
    replaceMap(db.patientProfiles, core.patientProfiles);
    replaceMap(db.patientAddresses, core.patientAddresses);
    replaceMap(db.emergencyContacts, core.emergencyContacts);
    replaceMap(db.patientHealthInfo, core.patientHealthInfo);
    replaceMap(db.patientProfilePhotos, core.patientProfilePhotos);
    replaceMap(db.medicationReminders, core.medicationReminders);
    replaceMap(db.medicationDoseLogs, core.medicationDoseLogs);
    if (Array.isArray(core.auditLogs)) {
      db.auditLogs = core.auditLogs;
    }

    const clinical = parsed.clinical || {};
    replaceMap(clinicalStore.patients, clinical.patients);
    replaceMap(clinicalStore.departments, clinical.departments);
    replaceMap(clinicalStore.doctors, clinical.doctors);
    replaceMap(clinicalStore.doctorAvailabilities, clinical.doctorAvailabilities);
    replaceMap(clinicalStore.doctorBlockedTimes, clinical.doctorBlockedTimes);
    replaceMap(clinicalStore.appointments, clinical.appointments);
    replaceMap(clinicalStore.encounters, clinical.encounters);
    replaceMap(clinicalStore.vitals, clinical.vitals);
    replaceMap(clinicalStore.allergies, clinical.allergies);
    replaceMap(clinicalStore.prescriptions, clinical.prescriptions);
    replaceMap(clinicalStore.documents, clinical.documents);
    replaceMap(clinicalStore.signedDownloadTokens, clinical.signedDownloadTokens);

    const ops = parsed.operations || {};
    replaceMap(opsStore.labOrders, ops.labOrders);
    replaceMap(opsStore.medicineBatches, ops.medicineBatches);
    replaceMap(opsStore.beds, ops.beds);
    replaceMap(opsStore.invoices, ops.invoices);
    replaceMap(opsStore.payments, ops.payments);
    replaceMap(opsStore.paymentReceipts, ops.paymentReceipts);
    replaceMap(opsStore.refunds, ops.refunds);
    replaceMap(opsStore.claims, ops.claims);
    replaceMap(opsStore.expenses, ops.expenses);
    replaceSet(opsStore.processedWebhookEvents, ops.processedWebhookEvents);

    const directory = parsed.directory || {};
    replaceMap(directoryStore.records, directory.records);
    if (Array.isArray(directory.importHistory)) {
      directoryStore.importHistory = directory.importHistory;
    }

    const security = parsed.security || {};
    replaceMap(securityStore.mfaSecrets, security.mfaSecrets);
    replaceMap(securityStore.devices, security.devices);
    replaceMap(securityStore.preferences, security.preferences);
    replaceMap(securityStore.outbox, security.outbox);
    if (Array.isArray(security.messagingLogs)) {
      securityStore.messagingLogs = security.messagingLogs;
    }
    if (security.metrics && typeof security.metrics === 'object') {
      Object.assign(securityStore.metrics, security.metrics);
    }

    const saas = parsed.saas || {};
    if (saas.plans instanceof Map && saas.plans.size > 0) {
      replaceMap(saasStore.plans, saas.plans);
    }
    replaceMap(saasStore.subscriptions, saas.subscriptions);
    replaceMap(saasStore.subscriptionInvoices, saas.subscriptionInvoices);
    replaceMap(saasStore.subscriptionPayments, saas.subscriptionPayments);
    replaceMap(saasStore.onboardings, saas.onboardings);
    replaceMap(saasStore.supportTickets, saas.supportTickets);
    replaceSet(saasStore.processedWebhooks, saas.processedWebhooks);
    if (Array.isArray(saas.announcements)) {
      saasStore.announcements = saas.announcements;
    }

    const ai = parsed.ai || {};
    replaceMap(aiStore.consents, ai.consents);
    replaceMap(aiStore.conversations, ai.conversations);
    replaceMap(aiStore.clinicalDrafts, ai.clinicalDrafts);
    if (Array.isArray(ai.usageLogs)) {
      aiStore.usageLogs = ai.usageLogs;
    }
    if (Array.isArray(ai.feedbacks)) {
      aiStore.feedbacks = ai.feedbacks;
    }

    lastPersistedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString();
    persistedBootHydrated = true;
    return true;
  } catch (err) {
    console.error('[MediCore DB Persistence] Failed to hydrate persisted snapshot; falling back to seed:', err);
    return false;
  }
}

export function getSharedFirebaseMetadata(): { projectId: string | null; firestoreDatabaseId: string | null } {
  const candidatePaths = [
    path.resolve(__dirname, '../../../firebase-applet-config.json'),
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '../firebase-applet-config.json'),
  ];
  for (const cfgPath of candidatePaths) {
    try {
      if (fs.existsSync(cfgPath)) {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        return {
          projectId: typeof parsed.projectId === 'string' ? parsed.projectId : null,
          firestoreDatabaseId:
            typeof parsed.firestoreDatabaseId === 'string' ? parsed.firestoreDatabaseId : null,
        };
      }
    } catch {
      // Ignore unreadable config file
    }
  }
  return { projectId: null, firestoreDatabaseId: null };
}
