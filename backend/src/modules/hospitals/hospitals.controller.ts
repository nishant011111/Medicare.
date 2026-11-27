import { Request, Response, NextFunction } from 'express';
import { HospitalsService } from './hospitals.service';

export class HospitalsController {
  static list(req: Request, res: Response, next: NextFunction) {
    try {
      const isSuperAdmin = req.auth?.globalRoles.includes('SUPER_ADMIN') ?? false;
      const result = HospitalsService.listHospitals(req.query, req.auth?.userId, isSuperAdmin);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static create(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = HospitalsService.registerHospital(req.auth!.userId, req.body);
      res.status(201).json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }

  static getById(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = HospitalsService.getHospitalById(req.params.id);
      res.status(200).json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }

  static update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = HospitalsService.updateHospital(req.params.id, req.auth!.userId, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static select(req: Request, res: Response, next: NextFunction) {
    try {
      const isSuperAdmin = req.auth!.globalRoles.includes('SUPER_ADMIN');
      const result = HospitalsService.selectHospital(req.auth!.userId, req.params.id, isSuperAdmin);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // Super Admin Controllers
  static adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const result = HospitalsService.listHospitals(req.query, req.auth!.userId, true);
      const stats = HospitalsService.getPlatformStatistics();
      res.status(200).json({
        success: true,
        ...result,
        statistics: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  static adminApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = HospitalsService.approveHospital(req.params.id, req.auth!.userId);
      res.status(200).json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }

  static adminReject(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = HospitalsService.rejectHospital(req.params.id, req.auth!.userId, req.body?.reason);
      res.status(200).json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }

  static adminSuspend(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = HospitalsService.suspendHospital(req.params.id, req.auth!.userId, req.body?.reason);
      res.status(200).json({
        success: true,
        data: hospital,
      });
    } catch (err) {
      next(err);
    }
  }
}
