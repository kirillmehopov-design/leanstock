import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import { createRefreshTokenValue, hashToken } from '../../src/utils/token.js';

describe('password utilities', () => {
  test('hashPassword produces a non-empty hash', async () => {
    const hash = await hashPassword('SecurePass1');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(20);
  });

  test('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('SecurePass1');
    const valid = await verifyPassword(hash, 'SecurePass1');
    expect(valid).toBe(true);
  });

  test('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('SecurePass1');
    const valid = await verifyPassword(hash, 'WrongPass99');
    expect(valid).toBe(false);
  });
});

describe('token utilities', () => {
  test('createRefreshTokenValue returns hex string of length 96', () => {
    const token = createRefreshTokenValue();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(96);
  });

  test('hashToken is deterministic', () => {
    const token = 'test-token-value';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  test('different tokens produce different hashes', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});
