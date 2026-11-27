import { Router } from 'express';
import { HospitalsController } from './hospitals.controller';
import { authenticate, requireHospitalAccess } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createHospitalSchema, updateHospitalSchema } from './hospitals.schema';
import { MembershipsController } from '../memberships/memberships.controller';
import { createInvitationSchema } from '../memberships/memberships.schema';

const router = Router();

router.get('/', authenticate, HospitalsController.list);
router.post('/', authenticate, validateRequest(createHospitalSchema), HospitalsController.create);
router.get('/:id', authenticate, HospitalsController.getById);
router.patch(
  '/:id',
  authenticate,
  requireHospitalAccess(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  validateRequest(updateHospitalSchema),
  HospitalsController.update
);
router.post('/:id/select', authenticate, HospitalsController.select);

// Hospital Invitations (Hospital Admin only for their own hospital)
router.post(
  '/:id/invitations',
  authenticate,
  requireHospitalAccess(['HOSPITAL_ADMIN', 'SUPER_ADMIN']),
  validateRequest(createInvitationSchema),
  MembershipsController.createInvitation
);

export default router;
