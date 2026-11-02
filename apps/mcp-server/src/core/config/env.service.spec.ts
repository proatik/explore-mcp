import { it, expect, describe } from 'vitest';

import { validateEnv } from '@/core/config/env.schema';
import { EnvService } from '@/core/config/env.service';

const base = {
  WOO_BASE_URL: 'https://store.example',
  WOO_CONSUMER_KEY: 'ck',
  WOO_CONSUMER_SECRET: 'cs',
  MCP_CLIENT_TOKEN: 'agent-token-0123456789'
};

function envOf(values: Record<string, unknown>): EnvService {
  return new EnvService(validateEnv(values));
}

describe('server environment', () => {
  it('needs only the store keys and one client token', () => {
    const env = envOf(base);

    expect(env.port).toBe(3000);
    expect(env.allowedHosts).toEqual(['localhost', '127.0.0.1', '[::1]']);
    expect(env.clients).toEqual([
      { id: 'agent', token: 'agent-token-0123456789', scopes: ['*'] }
    ]);
  });

  it('treats a blank line as unset', () => {
    expect(
      envOf({ ...base, LOG_LEVEL: '', MCP_ALLOWED_HOSTS: '' }).logLevel
    ).toBe('info');
  });

  it('accepts scoped clients from MCP_CLIENTS instead', () => {
    const clients = [
      {
        id: 'ro',
        token: 'readonly-token-0123456789',
        scopes: ['products:read']
      }
    ];
    const env = envOf({
      ...base,
      MCP_CLIENT_TOKEN: '',
      MCP_CLIENTS: JSON.stringify(clients)
    });

    expect(env.clients).toEqual(clients);
  });

  it('refuses to send store credentials over plain HTTP to a remote host', () => {
    expect(() =>
      validateEnv({ ...base, WOO_BASE_URL: 'http://store.example' })
    ).toThrow(/plain HTTP/);
    expect(() =>
      validateEnv({ ...base, WOO_BASE_URL: 'http://127.0.0.1:8080' })
    ).not.toThrow();
  });

  it('rejects a missing client, a short token and an unknown scope', () => {
    const unknownScope =
      '[{"id":"x","token":"long-enough-token-123","scopes":["admin"]}]';

    expect(() => validateEnv({ ...base, MCP_CLIENT_TOKEN: '' })).toThrow(
      /MCP_CLIENT_TOKEN/
    );
    expect(() => validateEnv({ ...base, MCP_CLIENT_TOKEN: 'short' })).toThrow(
      /16 characters/
    );
    expect(() => envOf({ ...base, MCP_CLIENTS: unknownScope })).toThrow(
      /MCP_CLIENTS/
    );
    expect(() => envOf({ ...base, MCP_CLIENTS: 'not json' })).toThrow(
      /JSON array/
    );
  });
});
