export const getVerificationEmailHtml = (name: string, verificationUrl: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .title { color: #1a202c; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    .text { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { font-size: 12px; color: #a0aec0; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .code-box { background: #edf2f7; padding: 10px 14px; border-radius: 4px; font-family: monospace; word-break: break-all; color: #2d3748; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Verify Your Email Address</div>
    <div class="text">Hi <strong>${name}</strong>,</div>
    <div class="text">Thank you for registering. Please confirm your email address by clicking the button below:</div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" class="button" target="_blank">Verify Email</a>
    </div>
    <div class="text">Or copy and paste this link into your browser:</div>
    <div class="code-box">${verificationUrl}</div>
    <div class="text" style="margin-top: 16px; font-size: 14px;">This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</div>
    <div class="footer">
      Advanced Authentication and Authorization System &bull; Secure Identity Management
    </div>
  </div>
</body>
</html>
  `;
};

export const getPasswordResetEmailHtml = (name: string, resetUrl: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .title { color: #1a202c; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    .text { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }
    .footer { font-size: 12px; color: #a0aec0; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .code-box { background: #edf2f7; padding: 10px 14px; border-radius: 4px; font-family: monospace; word-break: break-all; color: #2d3748; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Reset Your Password</div>
    <div class="text">Hi <strong>${name}</strong>,</div>
    <div class="text">We received a request to reset your password. Click the button below to choose a new password:</div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="button" target="_blank">Reset Password</a>
    </div>
    <div class="text">Or copy and paste this link into your browser:</div>
    <div class="code-box">${resetUrl}</div>
    <div class="text" style="margin-top: 16px; font-size: 14px;">This link will expire in 15 minutes. For security reasons, resetting your password will also revoke all active sessions. If you did not request a password reset, please secure your account immediately.</div>
    <div class="footer">
      Advanced Authentication and Authorization System &bull; Secure Identity Management
    </div>
  </div>
</body>
</html>
  `;
};

export const getSecurityAlertEmailHtml = (name: string, subject: string, details: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .title { color: #dc2626; font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    .text { color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #a0aec0; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .alert-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 4px; color: #991b1b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Security Notification: ${subject}</div>
    <div class="text">Hi <strong>${name}</strong>,</div>
    <div class="alert-box">${details}</div>
    <div class="text" style="margin-top: 20px;">If this activity was you, no action is needed. If you did not perform this activity, please reset your password and review your active sessions immediately.</div>
    <div class="footer">
      Advanced Authentication and Authorization System &bull; Secure Identity Management
    </div>
  </div>
</body>
</html>
  `;
};
