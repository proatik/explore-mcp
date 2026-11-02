import {
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  ProtocolError
} from '@modelcontextprotocol/client';

// auth: fix credentials. transient: reconnecting may help.
// timeout: the call may still have run on the server.
// protocol: the server understood and refused the request.
export type FailureKind =
  'auth' | 'transient' | 'timeout' | 'protocol' | 'unknown';

const TRANSIENT_SDK_CODES: readonly string[] = [
  SdkErrorCode.ConnectionClosed,
  SdkErrorCode.NotConnected,
  SdkErrorCode.SendFailed,
  SdkErrorCode.ClientHttpFailedToOpenStream
];

const AUTH_SDK_CODES: readonly string[] = [
  SdkErrorCode.ClientHttpAuthentication,
  SdkErrorCode.ClientHttpForbidden
];

const NETWORK_ERROR_CODES: readonly string[] = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND'
];

export function classifyError(error: unknown): FailureKind {
  if (error instanceof SdkHttpError) {
    const isAuthStatus = error.status === 401 || error.status === 403;

    return AUTH_SDK_CODES.includes(error.code) || isAuthStatus
      ? 'auth'
      : 'transient';
  }

  if (error instanceof SdkError) {
    if (error.code === SdkErrorCode.RequestTimeout) return 'timeout';

    if (TRANSIENT_SDK_CODES.includes(error.code)) return 'transient';

    // a wrapper such as ERA_NEGOTIATION_FAILED is classified by its cause.
    return error.cause ? classifyError(error.cause) : 'unknown';
  }

  if (error instanceof ProtocolError) return 'protocol';

  if (error instanceof TypeError && /fetch failed/i.test(error.message))
    return 'transient';

  const code = (error as { cause?: { code?: string } } | undefined)?.cause
    ?.code;

  return code && NETWORK_ERROR_CODES.includes(code) ? 'transient' : 'unknown';
}

export function describeError(error: unknown): string {
  if (error instanceof SdkHttpError)
    return error.status
      ? `${error.message} (HTTP ${error.status})`
      : error.message;

  if (error instanceof ProtocolError)
    return `${error.message} (JSON-RPC ${error.code})`;

  return error instanceof Error ? error.message : String(error);
}
