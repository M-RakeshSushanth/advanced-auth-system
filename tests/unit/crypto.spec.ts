import { CryptoUtil } from '../../src/common/utils/crypto.util';

describe('CryptoUtil', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('should generate random tokens of expected length', () => {
    const token = CryptoUtil.generateRandomToken(32);
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex = 64 characters
  });

  it('should hash token deterministically using SHA-256', () => {
    const raw = 'my-secret-verification-token';
    const hash1 = CryptoUtil.hashToken(raw);
    const hash2 = CryptoUtil.hashToken(raw);
    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should encrypt and decrypt string using AES-256-GCM', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP'; // Base32 TOTP secret
    const ciphertext = CryptoUtil.encrypt(plaintext, secretKey);

    expect(ciphertext).toContain(':');
    const decrypted = CryptoUtil.decrypt(ciphertext, secretKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw error when decrypting invalid ciphertext format', () => {
    expect(() => {
      CryptoUtil.decrypt('invalid-data', secretKey);
    }).toThrow('Invalid ciphertext format');
  });

  it('should generate formatted backup recovery codes', () => {
    const { plaintextCodes, hashedCodes } = CryptoUtil.generateBackupCodes(10, 8);

    expect(plaintextCodes).toHaveLength(10);
    expect(hashedCodes).toHaveLength(10);

    // Each code has format "xxxx-xxxx"
    plaintextCodes.forEach((code, index) => {
      expect(code).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(CryptoUtil.hashToken(code)).toBe(hashedCodes[index]);
    });
  });
});
