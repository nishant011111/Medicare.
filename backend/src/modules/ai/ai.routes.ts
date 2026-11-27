import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth.middleware';
import { AIService, aiStore } from './ai.service';
import { ApiError } from '../../utils/errors';

const router = Router();

// 1. POST /api/v1/ai/chat
router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const role = req.auth?.hospitalRoles[0] || req.auth?.globalRoles[0] || 'PATIENT';
    const data = await AIService.chat(hospitalId, req.auth!.userId, role, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/v1/ai/conversations
router.get('/conversations', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const list = Array.from(aiStore.conversations.values()).filter(
    (c) => c.hospitalId === hospitalId && c.userId === req.auth!.userId
  );
  res.json({ success: true, data: list });
});

// 3. GET /api/v1/ai/conversations/:id
router.get('/conversations/:id', authenticate, (req, res, next) => {
  const conv = aiStore.conversations.get(req.params.id);
  if (!conv || conv.userId !== req.auth!.userId) {
    return next(ApiError.notFound('AI Conversation not found'));
  }
  res.json({ success: true, data: conv });
});

// 4. POST /api/v1/ai/report-summaries
router.post('/report-summaries', authenticate, async (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = await AIService.summarizeLabReport(hospitalId, req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/v1/ai/clinical-note-drafts
router.post('/clinical-note-drafts', authenticate, async (req, res, next) => {
  try {
    if (!req.auth?.hospitalRoles.includes('DOCTOR') && !req.auth?.globalRoles.includes('SUPER_ADMIN')) {
      throw ApiError.forbidden('Only doctors can generate AI clinical note drafts');
    }
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = await AIService.createClinicalNoteDraft(hospitalId, req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Doctor Approval of AI Clinical Draft
router.post('/clinical-note-drafts/:id/approve', authenticate, (req, res, next) => {
  try {
    if (!req.auth?.hospitalRoles.includes('DOCTOR') && !req.auth?.globalRoles.includes('SUPER_ADMIN')) {
      throw ApiError.forbidden('Only an attending doctor can approve an AI clinical note draft');
    }
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = AIService.approveClinicalNoteDraft(hospitalId, req.params.id, req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/v1/ai/analytics/query
router.post('/analytics/query', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = AIService.queryNaturalLanguageAnalytics(hospitalId, req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/v1/ai/inventory/forecast
router.post('/inventory/forecast', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = AIService.generateInventoryForecast(hospitalId, req.auth!.userId, req.body.horizonDays || 14);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 8. POST /api/v1/ai/appointments/forecast
router.post('/appointments/forecast', authenticate, (req, res, next) => {
  try {
    const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
    const data = AIService.generateAppointmentForecast(hospitalId, req.auth!.userId, req.body.horizonDays || 7);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 9. POST /api/v1/ai/feedback
router.post('/feedback', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const entry = {
    id: crypto.randomUUID(),
    hospitalId,
    userId: req.auth!.userId,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  aiStore.feedbacks.unshift(entry);
  res.status(201).json({ success: true, data: entry });
});

// 10. GET /api/v1/ai/usage
router.get('/usage', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const logs = aiStore.usageLogs.filter((l) => l.hospitalId === hospitalId);
  const totalTokens = logs.reduce((acc, l) => acc + l.totalTokens, 0);
  res.json({
    success: true,
    data: {
      hospitalId,
      totalRequests: logs.length,
      totalTokens,
      logs: logs.slice(0, 50),
    },
  });
});

// 11. GET /api/v1/ai/consent
router.get('/consent', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const data = AIService.getOrInitConsent(req.auth!.userId, hospitalId);
  res.json({ success: true, data });
});

// 12. PUT /api/v1/ai/consent
router.put('/consent', authenticate, (req, res) => {
  const hospitalId = (req.headers['x-hospital-id'] as string) || req.auth?.activeHospitalId || '11111111-1111-4111-8111-111111111111';
  const data = AIService.updateConsent(req.auth!.userId, hospitalId, req.body);
  res.json({ success: true, data });
});

export default router;
