import { it, expect, describe } from 'vitest';

import { RateLimiter } from '@/core/rate-limit/rate-limiter.service';

describe('RateLimiter', () => {
  it('blocks after the limit and resets with the window', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1_000, () => now);

    expect([
      limiter.check('a'),
      limiter.check('a'),
      limiter.check('a') > 0
    ]).toEqual([0, 0, true]);
    expect(limiter.check('b')).toBe(0);

    now = 1_000;

    expect(limiter.check('a')).toBe(0);
  });
});
