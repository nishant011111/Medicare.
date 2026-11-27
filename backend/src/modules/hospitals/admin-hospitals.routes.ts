import { Router } from 'express';
import { HospitalsController } from './hospitals.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';
import { UsersController } from '../users/users.controller';

const router = Router();

router.use(authenticate, requireRoles('SUPER_ADMIN'));

router.get('/hospitals', HospitalsController.adminList);
router.post('/hospitals/:id/approve', HospitalsController.adminApprove);
router.post('/hospitals/:id/reject', HospitalsController.adminReject);
router.post('/hospitals/:id/suspend', HospitalsController.adminSuspend);

router.get('/users', UsersController.listUsers);
router.patch('/users/:id/status', UsersController.updateStatus);

export default router;
