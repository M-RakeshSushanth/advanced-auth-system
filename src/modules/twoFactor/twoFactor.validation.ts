import { z } from 'zod';

export const verifyTotpSetupSchema = z.object({
  code: z
    .string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d+$/, 'TOTP code must contain only numbers'),
});

export const disableTotpSchema = z.object({
  password: z.string().optional(),
  code: z.string().optional(),
}).refine((data) => data.password || data.code, {
  message: 'Either your current password or a 6-digit TOTP code is required to disable 2FA',
});

export const verifyLogin2FASchema = z.object({
  tempToken: z.string().min(1, 'Temporary 2FA token is required'),
  code: z.string().min(6, 'Code must be at least 6 characters'),
});
