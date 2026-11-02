import { createHash } from 'node:crypto';

import { ToolError } from '@/core/mcp/tool-error';

import type { CallToolResult } from '@modelcontextprotocol/server';

interface StoredResult {
  fingerprint: string;
  result: Promise<CallToolResult>;
  expiresAt: number;
}

export interface IdempotencyScope {
  clientId: string;
  tool: string;
  key: string | undefined;
}

const DEFAULT_TTL_MS = 10 * 60_000;

// in-memory, so it covers retries against one instance; scale out with redis.
export class IdempotencyStore {
  private readonly results = new Map<string, StoredResult>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly now: () => number = Date.now
  ) {}

  async run(
    scope: IdempotencyScope,
    args: unknown,
    execute: () => Promise<CallToolResult>
  ): Promise<CallToolResult> {
    if (!scope.key) return await execute();

    this.evictExpired();

    const id = JSON.stringify([scope.clientId, scope.tool, scope.key]);
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(args))
      .digest('hex');
    const existing = this.results.get(id);

    if (existing) return await this.replay(existing, fingerprint);

    const result = execute();

    this.results.set(id, {
      fingerprint,
      result,
      expiresAt: this.now() + this.ttlMs
    });

    try {
      const value = await result;

      // a failure is forgotten so a corrected retry can still run.
      if (value.isError) this.results.delete(id);

      return value;
    } catch (error) {
      this.results.delete(id);

      throw error;
    }
  }

  private async replay(
    existing: StoredResult,
    fingerprint: string
  ): Promise<CallToolResult> {
    if (existing.fingerprint !== fingerprint) {
      throw new ToolError(
        'CONFLICT',
        'This idempotencyKey was already used with different arguments.'
      );
    }

    const replayed = await existing.result;

    return {
      ...replayed,
      _meta: { ...replayed._meta, idempotentReplay: true }
    };
  }

  private evictExpired(): void {
    const now = this.now();

    for (const [id, entry] of this.results) {
      if (entry.expiresAt <= now) this.results.delete(id);
    }
  }
}
