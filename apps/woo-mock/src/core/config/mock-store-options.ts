export interface MockStoreOptions {
  host: string;
  port: number;
  consumerKey: string;
  consumerSecret: string;
  shouldLog: boolean;
}

export const MOCK_STORE_OPTIONS = Symbol('MOCK_STORE_OPTIONS');

export const DEFAULT_MOCK_STORE_OPTIONS: MockStoreOptions = {
  host: '127.0.0.1',
  port: 0,
  consumerKey: 'ck_dev',
  consumerSecret: 'cs_dev',
  shouldLog: false
};

export function loadMockStoreOptions(env: NodeJS.ProcessEnv): MockStoreOptions {
  return {
    host: env.WOO_MOCK_HOST ?? '127.0.0.1',
    port: Number(env.WOO_MOCK_PORT ?? 8080),
    consumerKey: env.WOO_CONSUMER_KEY ?? DEFAULT_MOCK_STORE_OPTIONS.consumerKey,
    consumerSecret:
      env.WOO_CONSUMER_SECRET ?? DEFAULT_MOCK_STORE_OPTIONS.consumerSecret,
    shouldLog: true
  };
}
