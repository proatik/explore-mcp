export const MAX_SESSIONS = 50;

export const SESSION_NOT_FOUND_MESSAGE = 'Chat session not found.';

export const RUN_IN_PROGRESS_MESSAGE = 'A reply is still in progress.';

export const NO_MODEL_MESSAGE =
  'No language model is configured. Set OPENAI_API_KEY and restart.';

export const APPROVAL_NOT_FOUND_MESSAGE =
  'This approval was already answered or has expired.';

/**
 * 'MAX_SESSIONS' bounds memory: the oldest session is dropped beyond it.
 */
