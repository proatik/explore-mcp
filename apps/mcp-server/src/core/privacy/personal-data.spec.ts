import { it, expect, describe } from 'vitest';

import { maskEmail, toDisplayName } from '@/core/privacy/personal-data';

describe('personal data helpers', () => {
  it('masks emails', () => {
    expect(maskEmail('maya.lindqvist@example.com')).toBe('m***@example.com');
    expect(maskEmail('')).toBe('');
    expect(maskEmail(undefined)).toBe('');
  });

  it('shortens names to a first name and last initial', () => {
    expect(toDisplayName('Maya', 'Lindqvist')).toBe('Maya L.');
    expect(toDisplayName('Maya', '')).toBe('Maya');
    expect(toDisplayName('', '')).toBe('Guest');
  });
});
