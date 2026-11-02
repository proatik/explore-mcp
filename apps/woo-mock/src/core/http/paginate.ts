import { MockHttpError } from '@/core/http/mock-http-error';

import type { Response } from 'express';

// woocommerce's own upper bound for per_page.
const MAX_PER_PAGE = 100;

export function paginate<T>(
  response: Response,
  items: T[],
  query: URLSearchParams
): T[] {
  const perPage = Number(query.get('per_page') ?? 10);
  const page = Number(query.get('page') ?? 1);

  if (!Number.isInteger(perPage) || perPage < 1 || perPage > MAX_PER_PAGE) {
    throw new MockHttpError(
      400,
      'rest_invalid_param',
      'Invalid parameter(s): per_page'
    );
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new MockHttpError(
      400,
      'rest_invalid_param',
      'Invalid parameter(s): page'
    );
  }

  response.setHeader('X-WP-Total', String(items.length));
  response.setHeader(
    'X-WP-TotalPages',
    String(Math.max(1, Math.ceil(items.length / perPage)))
  );

  return items.slice((page - 1) * perPage, page * perPage);
}

export function toSearchParams(
  query: Record<string, unknown>
): URLSearchParams {
  const entries = Object.entries(query).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  );

  return new URLSearchParams(entries);
}
