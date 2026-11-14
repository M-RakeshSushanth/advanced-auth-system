import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { env } from '../../config/env.config';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { UserRepository } from '../users/user.repository';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../common/errors/http-errors';
import { EmailService } from '../email/email.service';

export class TwoFactorService {
  constructor(private userRepository = new UserRepository()) {
    authenticator.options = {
      window: 1, // Allow 1 step +/- to tolerate minor clock skew
    };
  }

  /**
   * Generates a new TOTP secret, otpauth URL, and QR code data URL.
   */
  async generateSetup(userId: string): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isTwoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled for this account');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, env.TOTP_APP_NAME, secret);
    const qrCode = await qrcode.toDataURL(otpauthUrl);

    // Save temporary encrypted secret until verified
    user.twoFactorSecretEncrypted = CryptoUtil.encrypt(secret, env.TOTP_ENCRYPTION_KEY);
    await user.save();

    return {
      secret,
      qrCode,
      otpauthUrl,
    };
  }

  /**
   * Verifies the initial TOTP code to confirm authenticator app setup,
   * activates 2FA, and generates backup recovery codes.
   */
  async enable2FA(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findById(userId, '+twoFactorSecretEncrypted +twoFactorBackupCodes');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorSecretEncrypted) {
      throw new BadRequestError('2FA setup has not been initiated. Please call setup first.');
    }

    if (user.isTwoFactorEnabled) {
      throw new BadRequestError('2FA is already enabled on your account.');
    }

    const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
    const isValid = authenticator.check(code, decryptedSecret);

    if (!isValid) {
      throw new BadRequestError('Invalid verification code. Please check your authenticator app and try again.');
    }

    // Generate 10 backup codes
    const { plaintextCodes, hashedCodes } = CryptoUtil.generateBackupCodes(10, 8);

    user.isTwoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedCodes;
    await user.save();

    // Send email security alert
    await EmailService.sendSecurityAlertEmail(
      user.email,
      user.name,
      'Two-Factor Authentication Enabled',
      'Two-factor authentication (2FA) was successfully enabled on your account.'
    );

    return { backupCodes: plaintextCodes };
  }

  /**
   * Disables 2FA on the user account.
   */
  async disable2FA(userId: string, password?: string, code?: string): Promise<void> {
    const user = await this.userRepository.findById(
      userId,
      '+password +twoFactorSecretEncrypted +twoFactorBackupCodes'
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isTwoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is not currently enabled.');
    }

    let isVerified = false;

    if (password && user.password) {
      isVerified = await user.comparePassword(password);
    }

    if (!isVerified && code && user.twoFactorSecretEncrypted) {
      const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
      isVerified = authenticator.check(code, decryptedSecret);
    }

    if (!isVerified) {
      throw new BadRequestError('Verification failed. Invalid password or 2FA code.');
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecretEncrypted = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    await EmailService.sendSecurityAlertEmail(
      user.email,
      user.name,
      'Two-Factor Authentication Disabled',
      'Two-factor authentication (2FA) was disabled on your account.'
    );
  }

  /**
   * Regenerates backup codes for user.
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userRepository.findById(
      userId,
      '+twoFactorSecretEncrypted +twoFactorBackupCodes'
    );
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecretEncrypted) {
      throw new BadRequestError('Two-factor authentication is not enabled.');
    }

    const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
    const isValid = authenticator.check(code, decryptedSecret);

    if (!isValid) {
      throw new BadRequestError('Invalid TOTP code.');
    }

    const { plaintextCodes, hashedCodes } = CryptoUtil.generateBackupCodes(10, 8);
    user.twoFactorBackupCodes = hashedCodes;
    await user.save();

    return { backupCodes: plaintextCodes };
  }

  /**
   * Validates a TOTP code or single-use backup recovery code during login.
   */
  async verifyCodeOrBackup(userId: string, candidateCode: string): Promise<boolean> {
    const user = await this.userRepository.findById(
      userId,
      '+twoFactorSecretEncrypted +twoFactorBackupCodes'
    );
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecretEncrypted) {
      throw new UnauthorizedError('Two-factor authentication is not properly configured.');
    }

    // Try TOTP check if candidateCode is 6 numeric digits
    if (/^\d{6}$/.test(candidateCode)) {
      const decryptedSecret = CryptoUtil.decrypt(user.twoFactorSecretEncrypted, env.TOTP_ENCRYPTION_KEY);
      const isTotpValid = authenticator.check(candidateCode, decryptedSecret);
      if (isTotpValid) {
        return true;
      }
    }

    // Check backup recovery codes
    const candidateHash = CryptoUtil.hashToken(candidateCode.trim().toLowerCase());
    const codeIndex = user.twoFactorBackupCodes.indexOf(candidateHash);

    if (codeIndex !== -1) {
      // Remove used single-use backup code
      user.twoFactorBackupCodes.splice(codeIndex, 1);
      await user.save();

      await EmailService.sendSecurityAlertEmail(
        user.email,
        user.name,
        'Backup Recovery Code Used',
        `A backup recovery code was used to sign in to your account. You have ${user.twoFactorBackupCodes.length} backup codes remaining.`
      );
      return true;
    }

    return false;
  }
}
