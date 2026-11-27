import crypto from 'crypto';
import { db } from './prisma';
import { hashPassword } from '../utils/crypto';
import { HospitalDirectoryImportService, directoryStore } from '../modules/directory/directory.service';
import { clinicalStore } from '../modules/clinical/clinical.service';
import { opsStore } from '../modules/operations/operations.service';
import { securityStore } from '../modules/security/security.service';
import { saasStore } from '../modules/saas/saas.service';
import { aiStore } from '../modules/ai/ai.service';

const FICTIONAL_DEMO_HOSPITAL_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
];

const FICTIONAL_DEMO_USER_IDS = [
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '55555555-5555-4555-8555-555555555555',
];

/**
 * Controlled database cleanup that removes fictional demo/placeholder records while preserving
 * real user-created records, system configuration, and imported Ranchi Hospital Directory records.
 */
export function purgeFictionalDemoRecords() {
  let removedHospitals = 0;
  for (const id of FICTIONAL_DEMO_HOSPITAL_IDS) {
    if (db.hospitals.delete(id)) removedHospitals += 1;
  }

  let removedUsers = 0;
  for (const uid of FICTIONAL_DEMO_USER_IDS) {
    if (db.users.delete(uid)) removedUsers += 1;
  }

  for (const [mId, m] of db.memberships.entries()) {
    if (FICTIONAL_DEMO_HOSPITAL_IDS.includes(m.hospitalId) || FICTIONAL_DEMO_USER_IDS.includes(m.userId)) {
      db.memberships.delete(mId);
    }
  }

  for (const [rId, ur] of db.userRoles.entries()) {
    if (
      (ur.hospitalId && FICTIONAL_DEMO_HOSPITAL_IDS.includes(ur.hospitalId)) ||
      FICTIONAL_DEMO_USER_IDS.includes(ur.userId)
    ) {
      db.userRoles.delete(rId);
    }
  }

  db.logAudit({
    userId: null,
    hospitalId: null,
    action: 'CONTROLLED_DEMO_DATA_CLEANUP',
    entityType: 'SystemDatabase',
    entityId: 'demo-cleanup-v1',
    ipAddress: null,
    userAgent: null,
    metadata: {
      removedFictionalHospitals: removedHospitals,
      removedPlaceholderUsers: removedUsers,
      preservedRealUserRecords: true,
    },
  });
}

export async function seedDatabaseIfEmpty() {
  if (directoryStore.records.size >= 25 && db.users.size > 0) return;

  const now = new Date();
  purgeFictionalDemoRecords();

  // Clear operational stores so no sample patients, dummy doctors, or fake invoices exist
  clinicalStore.reset();
  opsStore.reset();
  securityStore.reset();
  saasStore.resetPlansOnly();
  aiStore.conversations.clear();
  aiStore.clinicalDrafts.clear();
  aiStore.usageLogs = [];

  // Bootstrap platform SUPER_ADMIN system account for platform administration & directory verification
  const superAdminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  if (!db.users.has(superAdminId)) {
    const defaultPassHash = await hashPassword('MediCore@2026');
    db.users.set(superAdminId, {
      id: superAdminId,
      fullName: 'MediCore Platform Administrator',
      email: 'superadmin@medicore.org',
      phone: '+919000000001',
      passwordHash: defaultPassHash,
      isEmailVerified: true,
      isActive: true,
      activeHospitalId: null,
      createdAt: now,
      updatedAt: now,
    });

    db.userRoles.set(crypto.randomUUID(), {
      id: crypto.randomUUID(),
      userId: superAdminId,
      roleCode: 'SUPER_ADMIN',
      hospitalId: null,
      membershipId: null,
      assignedAt: now,
    });
  }

  // Import the 25 real Ranchi Hospital Directory records (RNC001 - RNC025) in PENDING_VERIFICATION state
  if (directoryStore.records.size === 0) {
    HospitalDirectoryImportService.importBundledRanchiDataset('JSON', superAdminId);
  }
}
