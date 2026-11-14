import { Request, Response } from 'express';
import { SessionService } from './session.service';
import { ApiResponse } from '../../common/utils/api-response.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';
import { UserRole } from '../../common/constants/roles.constant';

export class SessionController {
  constructor(private sessionService = new SessionService()) {}

  getSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const currentSessionId = req.session?._id.toString();
    const sessions = await this.sessionService.getUserSessions(userId, currentSessionId);

    ApiResponse.success(res, 'Active sessions retrieved successfully', sessions, HttpStatus.OK);
  });

  revokeSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { sessionId } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    await this.sessionService.revokeSession(userId, sessionId, isAdmin);

    ApiResponse.success(res, 'Session revoked successfully', null, HttpStatus.OK);
  });

  revokeOtherSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const currentSessionId = req.session!._id.toString();

    await this.sessionService.revokeAllOtherSessions(userId, currentSessionId);

    ApiResponse.success(res, 'All other sessions have been revoked', null, HttpStatus.OK);
  });

  revokeAllSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();

    await this.sessionService.revokeAllSessions(userId);

    ApiResponse.success(res, 'All sessions have been revoked. Please log in again.', null, HttpStatus.OK);
  });
}
