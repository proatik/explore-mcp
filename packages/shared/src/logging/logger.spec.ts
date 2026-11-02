import { it, expect, describe, afterEach } from 'vitest';

import { requestContext } from './request-context';
import { redact, createLogger, configureLogging } from './logger';

describe('logger', () => {
  afterEach(() => {
    configureLogging({ level: 'silent' });
  });

  it('redacts secrets and contact details from context fields', () => {
    expect(
      redact({
        authorization: 'Bearer x',
        nested: { email: 'a@b.c', ok: 1 },
        list: [{ token: 't' }]
      })
    ).toEqual({
      authorization: '[redacted]',
      nested: { email: '[redacted]', ok: 1 },
      list: [{ token: '[redacted]' }]
    });
  });

  it('writes one json line with the request id and the real error', () => {
    const lines: string[] = [];

    configureLogging({ level: 'info', write: (line) => lines.push(line) });

    requestContext.run({ requestId: 'req-1', clientId: 'ops' }, () => {
      createLogger('test').error('tool failed', new Error('boom'), {
        tool: 'get_order'
      });
    });

    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;

    expect(entry).toMatchObject({
      level: 'error',
      logger: 'test',
      message: 'tool failed',
      requestId: 'req-1',
      tool: 'get_order'
    });
    expect(entry.error).toMatchObject({ name: 'Error', message: 'boom' });
  });

  it('drops messages below the configured level', () => {
    const lines: string[] = [];

    configureLogging({ level: 'warn', write: (line) => lines.push(line) });

    createLogger('test').log('ignored');

    expect(lines).toEqual([]);
  });
});
