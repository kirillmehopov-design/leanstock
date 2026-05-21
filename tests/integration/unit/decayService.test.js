import { calculateDecayedPrice } from '../../src/services/decayService.js';

describe('calculateDecayedPrice', () => {
  test('applies 10 percent discount', () => {
    expect(calculateDecayedPrice(1000, 500)).toBe(900);
  });

  test('does not go below minimum sale price', () => {
    expect(calculateDecayedPrice(520, 500)).toBe(500);
  });
});
