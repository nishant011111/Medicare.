import { Request, Response, NextFunction } from 'express';
import { MembershipsService } from './memberships.service';

export class MembershipsController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const isSuperAdmin = req.auth!.globalRoles.includes('SUPER_ADMIN');
      const hospitalId = typeof req.query.hospitalId === 'string' ? req.query.hospitalId : undefined;
      const data = MembershipsService.listMemberships(req.auth!.userId, isSuperAdmin, hospitalId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static createInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = MembershipsService.createInvitation(
        req.params.id,
        req.auth!.userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: invitation,
      });
    } catch (err) {
      next(err);
    }
  }

  static acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const membership = MembershipsService.acceptInvitation(req.auth!.userId, req.body.inviteCode);
      res.status(200).json({
        success: true,
        data: membership,
      });
    } catch (err) {
      next(err);
    }
  }

  static updateMembership(req: Request, res: Response, next: NextFunction) {
    try {
      const isSuperAdmin = req.auth!.globalRoles.includes('SUPER_ADMIN');
      const updated = MembershipsService.updateMembership(
        req.params.id,
        req.auth!.userId,
        isSuperAdmin,
        req.body
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
