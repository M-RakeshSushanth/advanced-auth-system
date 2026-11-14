import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env.config';
import { logger } from '../../config/logger';
import {
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
  getSecurityAlertEmailHtml,
} from './templates/email.templates';

export class EmailService {
  private static transporter: Transporter | null = null;

  private static async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (env.EMAIL_SERVICE_MODE === 'smtp' && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // In development or ethereal mode, create or use ethereal test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        logger.info(`Ethereal email test account created: ${testAccount.user}`);
      } catch (err) {
        logger.warn('Failed to initialize Ethereal account, falling back to JSON transport:', err);
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }

    return this.transporter;
  }

  /**
   * Sends an email verification link to user.
   */
  static async sendVerificationEmail(to: string, name: string, token: string): Promise<string | false> {
    if (env.NODE_ENV === 'test') {
      logger.info(`[Test Mode] Verification email to ${to} with token: ${token}`);
      return 'test-message-id';
    }

    try {
      const transporter = await this.getTransporter();
      const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Verify your email address',
        html: getVerificationEmailHtml(name, verificationUrl),
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Verification email sent. Preview URL: ${previewUrl}`);
      }
      return info.messageId;
    } catch (error) {
      logger.error(`Failed to send verification email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Sends a password reset email link to user.
   */
  static async sendPasswordResetEmail(to: string, name: string, token: string): Promise<string | false> {
    if (env.NODE_ENV === 'test') {
      logger.info(`[Test Mode] Password reset email to ${to} with token: ${token}`);
      return 'test-message-id';
    }

    try {
      const transporter = await this.getTransporter();
      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Reset your account password',
        html: getPasswordResetEmailHtml(name, resetUrl),
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Password reset email sent. Preview URL: ${previewUrl}`);
      }
      return info.messageId;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Sends a security alert (e.g. refresh token reuse detected, password changed, etc.)
   */
  static async sendSecurityAlertEmail(to: string, name: string, subject: string, details: string): Promise<string | false> {
    if (env.NODE_ENV === 'test') {
      logger.info(`[Test Mode] Security alert email to ${to}: ${subject}`);
      return 'test-message-id';
    }

    try {
      const transporter = await this.getTransporter();

      const info = await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: `Security Alert: ${subject}`,
        html: getSecurityAlertEmailHtml(name, subject, details),
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Security alert email sent. Preview URL: ${previewUrl}`);
      }
      return info.messageId;
    } catch (error) {
      logger.error(`Failed to send security alert to ${to}:`, error);
      return false;
    }
  }
}
