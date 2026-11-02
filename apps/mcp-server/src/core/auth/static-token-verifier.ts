import { createHash, timingSafeEqual } from 'node:crypto';

import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';

import type { RegisteredClient } from '@/core/config/env.schema';
import type {
  AuthInfo,
  OAuthTokenVerifier
} from '@modelcontextprotocol/server';

interface ClientRecord {
  id: string;
  digest: Buffer;
  scopes: string[];
}

// the SDK requires an expiry; a static token is valid for this long per check.
const VERIFIED_TOKEN_TTL_SECONDS = 300;

export class StaticTokenVerifier implements OAuthTokenVerifier {
  private readonly clients: ClientRecord[];

  constructor(clients: RegisteredClient[]) {
    this.clients = clients.map((client) => ({
      id: client.id,
      digest: this.digest(client.token),
      scopes: [...client.scopes]
    }));
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const presented = this.digest(token);
    let match: ClientRecord | undefined;

    // every entry is compared so timing never reveals which one matched.
    for (const client of this.clients) {
      if (timingSafeEqual(presented, client.digest)) match = client;
    }

    if (!match)
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Invalid access token.'
      );

    return {
      token,
      clientId: match.id,
      scopes: match.scopes,
      expiresAt: Math.floor(Date.now() / 1000) + VERIFIED_TOKEN_TTL_SECONDS
    };
  }

  private digest(value: string): Buffer {
    return createHash('sha256').update(value).digest();
  }
}
