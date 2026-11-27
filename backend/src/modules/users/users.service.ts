import { db } from '../../database/prisma';
import { ApiError } from '../../utils/errors';
import { AuthService } from '../auth/auth.service';

export class UsersService {
  static listPlatformUsers() {
    return Array.from(db.users.values()).map((u) => AuthService.buildMeProfile(u.id));
  }

  static toggleUserActiveStatus(targetUserId: string, isActive: boolean, actorUserId: string) {
    const user = db.users.get(targetUserId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    user.isActive = isActive;
    user.updatedAt = new Date();

    db.logAudit({
      userId: actorUserId,
      hospitalId: null,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: targetUserId,
      ipAddress: null,
      userAgent: null,
      metadata: { isActive },
    });

    return AuthService.buildMeProfile(targetUserId);
  }
}
