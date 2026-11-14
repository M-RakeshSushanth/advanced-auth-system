import crypto from 'crypto';

export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Hashes a string (like a verification token, reset token, or refresh token) using SHA-256.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random token string.
   */
  static generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Normalizes an encryption key to a 32-byte Buffer.
   */
  private static getKeyBuffer(key: string): Buffer {
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex');
    }
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns formatted string: iv:tag:encryptedData
   */
  static encrypt(plaintext: string, secretKey: string): string {
    const key = this.getKeyBuffer(secretKey);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext (iv:tag:encryptedData) using AES-256-GCM.
   */
  static decrypt(ciphertext: string, secretKey: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format. Expected iv:tag:data');
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const key = this.getKeyBuffer(secretKey);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generates a set of single-use backup recovery codes.
   */
  static generateBackupCodes(count = 10, length = 8): { plaintextCodes: string[]; hashedCodes: string[] } {
    const plaintextCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate readable alphanumeric code like 'ab49-c12e'
      const raw = crypto.randomBytes(length / 2).toString('hex').toLowerCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
      plaintextCodes.push(formatted);
      hashedCodes.push(this.hashToken(formatted));
    }

    return { plaintextCodes, hashedCodes };
  }
}
