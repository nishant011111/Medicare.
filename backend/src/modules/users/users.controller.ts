import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';

export class UsersController {
  static listUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = UsersService.listPlatformUsers();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }

  static updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = UsersService.toggleUserActiveStatus(
        req.params.id,
        Boolean(req.body.isActive),
        req.auth!.userId
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
