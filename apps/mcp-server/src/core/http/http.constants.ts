export const MCP_PATH = '/mcp';

export const HEALTH_PATH = '/healthz';

export const REQUEST_ID_HEADER = 'x-request-id';

export const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * 'REQUEST_ID_PATTERN' keeps a caller's request ID safe to echo and log.
 */
