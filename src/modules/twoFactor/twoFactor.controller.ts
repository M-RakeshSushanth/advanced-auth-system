import { Request, Response } from 'express';
import { TwoFactorService } from './twoFactor.service';
import { ApiResponse } from '../../common/utils/api-response.util';
import { HttpStatus } from '../../common/constants/http-status.constant';
import { asyncHandler } from '../../common/utils/async-handler.util';

export class TwoFactorController {
  constructor(private twoFactorService = new TwoFactorService()) {}

  generateSetup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const setupData = await this.twoFactorService.generateSetup(userId);

    ApiResponse.success(
      res,
      'Scan the QR code or enter the secret in your authenticator app (Google Authenticator, Authy, 1Password, etc.)',
      setupData,
      HttpStatus.OK
    );
  });

  enable2FA = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { code } = req.body;

    const result = await this.twoFactorService.enable2FA(userId, code);

    ApiResponse.success(
      res,
      'Two-factor authentication successfully enabled. Store your backup recovery codes securely.',
      result,
      HttpStatus.OK
    );
  });

  disable2FA = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { password, code } = req.body;

    await this.twoFactorService.disable2FA(userId, password, code);

    ApiResponse.success(res, 'Two-factor authentication has been disabled', null, HttpStatus.OK);
  });

  regenerateBackupCodes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id.toString();
    const { code } = req.body;

    const result = await this.twoFactorService.regenerateBackupCodes(userId, code);

    ApiResponse.success(
      res,
      'New backup recovery codes generated. Previous codes have been invalidated.',
      result,
      HttpStatus.OK
    );
  });
}
