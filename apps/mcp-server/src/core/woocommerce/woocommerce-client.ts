import { createLogger } from '@woocommerce-mcp/shared';

import { WooCommerceApiError } from '@/core/woocommerce/woocommerce-api-error';
import {
  MAX_RETRY_AFTER_MS,
  WOOCOMMERCE_API_PATH,
  WOOCOMMERCE_SITE_PATH,
  DEFAULT_RETRY_BASE_DELAY_MS
} from '@/core/woocommerce/woocommerce.constants';

import type { WooCommerceErrorKind } from '@/core/woocommerce/woocommerce-api-error';
import type {
  WooCommerceRequest,
  WooCommerceResponse
} from '@/core/woocommerce/woocommerce.types';

export interface WooCommerceClientOptions {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs?: number;
  fetch?: typeof fetch;
}

type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

export class WooCommerceClient {
  private readonly logger = createLogger('woocommerce');
  private readonly authorization: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: WooCommerceClientOptions) {
    const credentials = `${options.consumerKey}:${options.consumerSecret}`;

    this.authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async get<T>(
    path: string,
    request: WooCommerceRequest = {}
  ): Promise<WooCommerceResponse<T>> {
    return await this.send<T>('GET', this.apiUrl(path), request);
  }

  async put<T>(
    path: string,
    request: WooCommerceRequest = {}
  ): Promise<WooCommerceResponse<T>> {
    return await this.send<T>('PUT', this.apiUrl(path), request);
  }

  async post<T>(
    path: string,
    request: WooCommerceRequest = {}
  ): Promise<WooCommerceResponse<T>> {
    return await this.send<T>('POST', this.apiUrl(path), request);
  }

  async delete<T>(
    path: string,
    request: WooCommerceRequest = {}
  ): Promise<WooCommerceResponse<T>> {
    return await this.send<T>('DELETE', this.apiUrl(path), request);
  }

  async getSite<T>(signal?: AbortSignal): Promise<WooCommerceResponse<T>> {
    const url = new URL(`${this.options.baseUrl}${WOOCOMMERCE_SITE_PATH}`);

    return await this.send<T>('GET', url, signal ? { signal } : {});
  }

  private apiUrl(path: string): URL {
    return new URL(
      `${this.options.baseUrl}${WOOCOMMERCE_API_PATH}/${path.replace(/^\//, '')}`
    );
  }

  // reads are retried; a write is not, because a timed-out write may have landed.
  private async send<T>(
    method: HttpMethod,
    url: URL,
    request: WooCommerceRequest
  ): Promise<WooCommerceResponse<T>> {
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const attempts = method === 'GET' ? this.options.maxRetries + 1 : 1;

    for (let attempt = 1; ; attempt++) {
      const isLastAttempt = attempt >= attempts;
      const outcome = await this.attempt<T>(method, url, request);

      if (!(outcome instanceof WooCommerceApiError)) return outcome;

      if (isLastAttempt || !outcome.isRetryable) throw outcome;

      this.logger.warn('woocommerce request will be retried', {
        method,
        path: url.pathname,
        attempt,
        kind: outcome.kind
      });

      await this.sleep(this.backoffMs(attempt, outcome), request.signal);
    }
  }

  private async attempt<T>(
    method: HttpMethod,
    url: URL,
    request: WooCommerceRequest
  ): Promise<WooCommerceResponse<T> | WooCommerceApiError> {
    const started = performance.now();
    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        method,
        headers: this.headers(request.body !== undefined),
        body:
          request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: this.signal(request.signal)
      });
    } catch (error) {
      return this.toNetworkError(error, request.signal);
    }

    this.logger.debug('woocommerce request', {
      method,
      path: url.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - started)
    });

    if (!response.ok) return await this.toApiError(response);

    const data = (await response.json()) as T;
    const total = response.headers.get('x-wp-total');
    const totalPages = response.headers.get('x-wp-totalpages');

    return {
      data,
      ...(total === null ? {} : { total: Number(total) }),
      ...(totalPages === null ? {} : { totalPages: Number(totalPages) })
    };
  }

  private headers(hasBody: boolean): Record<string, string> {
    return {
      Accept: 'application/json',
      Authorization: this.authorization,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {})
    };
  }

  private signal(callerSignal?: AbortSignal): AbortSignal {
    const timeout = AbortSignal.timeout(this.options.timeoutMs);

    return callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
  }

  private backoffMs(attempt: number, error: WooCommerceApiError): number {
    if (error.retryAfterMs !== undefined)
      return Math.min(error.retryAfterMs, MAX_RETRY_AFTER_MS);

    const base =
      (this.options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS) *
      2 ** (attempt - 1);

    return base + Math.random() * base * 0.25;
  }

  private async toApiError(response: Response): Promise<WooCommerceApiError> {
    const body = await response.json().catch((): unknown => undefined);
    const { code, message } = (body ?? {}) as {
      code?: string;
      message?: string;
    };
    const text = message
      ? message.replace(/<[^>]*>/g, '').trim()
      : `HTTP ${response.status}.`;
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const hasRetryAfter =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0;

    return new WooCommerceApiError(this.kindForStatus(response.status), text, {
      status: response.status,
      ...(code ? { wooCode: code } : {}),
      ...(hasRetryAfter ? { retryAfterMs: retryAfterSeconds * 1000 } : {})
    });
  }

  private kindForStatus(status: number): WooCommerceErrorKind {
    switch (status) {
      case 400:
        return 'bad_request';
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'not_found';
      case 429:
        return 'rate_limited';
      case 502:
      case 503:
      case 504:
        return 'unavailable';
      default:
        return 'upstream';
    }
  }

  private toNetworkError(
    error: unknown,
    callerSignal?: AbortSignal
  ): WooCommerceApiError {
    if (callerSignal?.aborted)
      return new WooCommerceApiError('cancelled', 'The request was cancelled.');

    const name = error instanceof Error ? error.name : '';

    if (name === 'TimeoutError' || name === 'AbortError') {
      return new WooCommerceApiError(
        'timeout',
        'WooCommerce did not respond in time.'
      );
    }

    return new WooCommerceApiError(
      'unavailable',
      'WooCommerce could not be reached.'
    );
  }

  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(
          new WooCommerceApiError('cancelled', 'The request was cancelled.')
        );

        return;
      }

      const timer = setTimeout(resolve, ms);

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);

          reject(
            new WooCommerceApiError('cancelled', 'The request was cancelled.')
          );
        },
        { once: true }
      );
    });
  }
}
