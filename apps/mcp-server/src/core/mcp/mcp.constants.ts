export const JSON_MIME_TYPE = 'application/json';

export const COMPLETION_LIMIT = 20;

export const COMPLETION_TIMEOUT_MS = 5_000;

export const GROUNDING_RULES = [
  'Ground rules:',
  '- Use only the store data provided in this conversation or returned by tools.',
  '- Do not invent store policies (returns, refunds, shipping times, discounts). If a policy is needed and not provided, say that a team member will confirm it.',
  '- Do not invent customer details, order contents, prices or stock levels.',
  '- Customer emails are masked on purpose. Do not try to reconstruct them.',
  '- Do not change anything in the store unless the user explicitly asks; write operations need human approval.'
].join('\n');

/**
 * 'COMPLETION_TIMEOUT_MS' exists because completion callbacks get no signal.
 */
