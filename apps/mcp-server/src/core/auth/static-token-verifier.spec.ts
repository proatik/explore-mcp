import { it, expect, describe } from 'vitest';

import { StaticTokenVerifier } from '@/core/auth/static-token-verifier';

const verifier = new StaticTokenVerifier([
  { id: 'ops', token: 'ops-token-0123456789', scopes: ['*'] },
  { id: 'ro', token: 'ro-token-0123456789', scopes: ['products:read'] }
]);

describe('StaticTokenVerifier', () => {
  it('identifies the client and its scopes', async () => {
    const auth = await verifier.verifyAccessToken('ro-token-0123456789');

    expect(auth).toMatchObject({ clientId: 'ro', scopes: ['products:read'] });
    expect(auth.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it('rejects unknown tokens', async () => {
    await expect(verifier.verifyAccessToken('nope')).rejects.toThrow(
      /invalid/i
    );
  });
});
