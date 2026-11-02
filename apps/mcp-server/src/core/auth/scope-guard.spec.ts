import { it, expect, describe } from 'vitest';

import { hasScope, requireScope } from '@/core/auth/scope-guard';

const readOnly = { token: 't', clientId: 'ro', scopes: ['products:read'] };

describe('scope guard', () => {
  it('grants listed scopes and the wildcard', () => {
    expect(hasScope(readOnly, 'products:read')).toBe(true);
    expect(hasScope({ ...readOnly, scopes: ['*'] }, 'orders:write')).toBe(true);
  });

  it('refuses missing scopes and anonymous callers', () => {
    expect(() => requireScope(readOnly, 'inventory:write')).toThrow(
      /inventory:write/
    );
    expect(() => requireScope(undefined, 'products:read')).toThrow(
      /authenticated/
    );
  });
});
