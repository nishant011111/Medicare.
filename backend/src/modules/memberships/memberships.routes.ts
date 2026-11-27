import { Router } from 'express';
import { MembershipsController } from './memberships.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { acceptInvitationSchema, updateMembershipSchema } from './memberships.schema';

const router = Router();

router.get('/memberships', authenticate, MembershipsController.list);
router.post(
  '/invitations/accept',
  authenticate,
  validateRequest(acceptInvitationSchema),
  MembershipsController.acceptInvitation
);
router.patch(
  '/memberships/:id',
  authenticate,
  validateRequest(updateMembershipSchema),
  MembershipsController.updateMembership
);

export default router;
