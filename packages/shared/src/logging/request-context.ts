import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  clientId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
