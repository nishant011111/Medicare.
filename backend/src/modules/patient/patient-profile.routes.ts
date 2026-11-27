import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { ApiError } from '../../utils/errors';
import { parseMultipartSingleFile } from '../../utils/multipart';
import {
  emergencyContactSchema,
  updateAddressSchema,
  updateFullPatientProfileSchema,
  updateHealthInformationSchema,
  updatePersonalInfoSchema,
} from './patient-profile.schema';
import { PatientProfileService } from './patient-profile.service';

const router = Router();

function getParamId(param: string | string[] | undefined): string {
  return Array.isArray(param) ? param[0] : param || '';
}

router.use('/patient/profile', authenticate, requireRoles('PATIENT'));
router.use('/patient/onboarding', authenticate, requireRoles('PATIENT'));

router.get('/patient/profile', (req, res, next) => {
  try {
    const data = PatientProfileService.getFullProfile(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/patient/profile', validateRequest(updateFullPatientProfileSchema), (req, res, next) => {
  try {
    const data = PatientProfileService.updateCompositeProfile(req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/patient/profile/personal', validateRequest(updatePersonalInfoSchema), (req, res, next) => {
  try {
    const data = PatientProfileService.updatePersonalInfo(req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/patient/profile/address', validateRequest(updateAddressSchema), (req, res, next) => {
  try {
    const data = PatientProfileService.updateAddress(req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/patient/profile/emergency-contact', validateRequest(emergencyContactSchema), (req, res, next) => {
  try {
    const data = PatientProfileService.upsertPrimaryEmergencyContact(req.auth!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/patient/profile/emergency-contacts', (req, res, next) => {
  try {
    const data = PatientProfileService.listEmergencyContacts(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/patient/profile/emergency-contacts', validateRequest(emergencyContactSchema), (req, res, next) => {
  try {
    const data = PatientProfileService.addEmergencyContact(req.auth!.userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/patient/profile/emergency-contacts/:contactId',
  validateRequest(emergencyContactSchema),
  (req, res, next) => {
    try {
      const contactId = getParamId(req.params.contactId);
      const data = PatientProfileService.updateEmergencyContact(req.auth!.userId, contactId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/patient/profile/emergency-contacts/:contactId', (req, res, next) => {
  try {
    const contactId = getParamId(req.params.contactId);
    const data = PatientProfileService.deleteEmergencyContact(req.auth!.userId, contactId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/patient/profile/health-information',
  validateRequest(updateHealthInformationSchema),
  (req, res, next) => {
    try {
      const data = PatientProfileService.updateHealthInformation(req.auth!.userId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/patient/profile/photo', async (req, res, next) => {
  try {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('multipart/form-data')) {
      const parsed = await parseMultipartSingleFile(req);
      const data = PatientProfileService.uploadProfilePhoto(req.auth!.userId, {
        buffer: parsed.buffer,
        fileName: parsed.fileName,
        claimedMimeType: parsed.mimeType,
      });
      res.status(200).json({ success: true, data });
      return;
    }

    if (req.body && typeof req.body.imageBase64 === 'string') {
      const raw = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(raw, 'base64');
      const data = PatientProfileService.uploadProfilePhoto(req.auth!.userId, {
        buffer,
        fileName: typeof req.body.fileName === 'string' ? req.body.fileName : 'avatar.jpg',
        claimedMimeType: typeof req.body.mimeType === 'string' ? req.body.mimeType : undefined,
      });
      res.status(200).json({ success: true, data });
      return;
    }

    throw ApiError.badRequest('Upload an image via multipart/form-data or imageBase64 payload', 'INVALID_PHOTO_UPLOAD');
  } catch (err) {
    next(err);
  }
});

router.get('/patient/profile/photo', (req, res, next) => {
  try {
    const photo = PatientProfileService.getProfilePhotoStreamData(req.auth!.userId);
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `inline; filename="${photo.fileName}"`);
    res.status(200).send(photo.buffer);
  } catch (err) {
    next(err);
  }
});

router.delete('/patient/profile/photo', (req, res, next) => {
  try {
    const data = PatientProfileService.deleteProfilePhoto(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/patient/onboarding/complete', (req, res, next) => {
  try {
    const data = PatientProfileService.completeOnboarding(req.auth!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
