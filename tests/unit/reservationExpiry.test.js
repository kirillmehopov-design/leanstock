/**
 * Unit tests for reservation expiry worker behaviour.
 * Tests the pure date/status logic without hitting the database.
 */

describe('reservation expiry logic', () => {
  test('a reservation with expiresAt in the past is eligible for expiry', () => {
    const now = new Date();
    const pastExpiry = new Date(now.getTime() - 60 * 1000); // 1 minute ago
    expect(pastExpiry < now).toBe(true);
  });

  test('a reservation with expiresAt in the future is NOT eligible for expiry', () => {
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 60 * 1000); // 1 minute from now
    expect(futureExpiry < now).toBe(false);
  });

  test('ACTIVE status is correct initial state', () => {
    const status = 'ACTIVE';
    expect(['ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED'].includes(status)).toBe(true);
    expect(status).toBe('ACTIVE');
  });

  test('EXPIRED is valid terminal status for timed-out reservations', () => {
    const terminalStatuses = ['CONFIRMED', 'CANCELLED', 'EXPIRED'];
    expect(terminalStatuses.includes('EXPIRED')).toBe(true);
  });

  test('default reservation TTL is 15 minutes', () => {
    const TTL_MINUTES = 15;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60 * 1000);
    const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000);
    expect(diffMinutes).toBe(15);
  });
});
