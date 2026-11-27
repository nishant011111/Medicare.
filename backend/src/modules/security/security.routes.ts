import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { SecurityAndNotificationService, securityStore, StructuredLogger } from './security.service';

const router = Router();

// MFA Endpoints
router.post('/security/mfa/setup', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.setupMfa(req.auth!.userId);
  res.json({ success: true, data });
});

router.post('/security/mfa/verify', authenticate, (req, res, next) => {
  try {
    const data = SecurityAndNotificationService.verifyAndEnableMfa(req.auth!.userId, req.body.totpCode);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Device & Session Management Endpoints
router.get('/security/devices', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.listUserDevices(req.auth!.userId);
  res.json({ success: true, data });
});

router.post('/security/devices/register', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.registerDevice(req.auth!.userId, {
    ...req.body,
    ipAddress: req.ip || '127.0.0.1',
  });
  res.status(201).json({ success: true, data });
});

router.post('/security/devices/:id/revoke', authenticate, (req, res, next) => {
  try {
    const data = SecurityAndNotificationService.revokeDeviceSession(req.auth!.userId, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/security/devices/logout-all', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.logoutAllDevices(req.auth!.userId);
  res.json({ success: true, data });
});

// Notification Preferences & Outbox History Endpoints
router.get('/notifications/preferences', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.getNotificationPreferences(req.auth!.userId);
  res.json({ success: true, data });
});

router.put('/notifications/preferences', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.updateNotificationPreferences(req.auth!.userId, req.body);
  res.json({ success: true, data });
});

router.get('/notifications', authenticate, (req, res) => {
  const list = Array.from(securityStore.outbox.values()).filter(
    (n) => n.recipientUserId === req.auth!.userId
  );
  res.json({ success: true, data: list });
});

router.post('/notifications/dispatch', authenticate, (req, res) => {
  const data = SecurityAndNotificationService.enqueueOutboxNotification({
    ...req.body,
    recipientUserId: req.body.recipientUserId || req.auth!.userId,
    hospitalId: (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId,
  });
  res.status(data.duplicatePrevented ? 200 : 201).json({ success: true, data });
});

// Provider-based Email & SMS Dispatch
router.post('/messaging/send', authenticate, async (req, res, next) => {
  try {
    const data = await SecurityAndNotificationService.sendEmailOrSms(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Protected Operational Diagnostics & Backup Status (SUPER_ADMIN only)
router.get('/observability/diagnostics', authenticate, requireRoles('SUPER_ADMIN'), (_req, res) => {
  res.json({
    success: true,
    data: {
      metrics: securityStore.metrics,
      structuredLogRedactionActive: true,
      sampleRedactedLog: StructuredLogger.sanitizePayload({
        event: 'USER_LOGIN_ATTEMPT',
        email: 'doctor@medicore.in',
        password: 'SuperSecretPassword123!',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        diagnosisName: 'Confidential Diagnosis',
      }),
    },
  });
});

export default router;
