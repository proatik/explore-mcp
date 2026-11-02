// keeps the first letter and the domain, enough to recognise but not to contact.
export function maskEmail(email: string | undefined | null): string {
  if (!email?.includes('@')) return '';

  const [local = '', domain] = email.split('@');

  return `${local.slice(0, 1)}***@${domain}`;
}

export function toDisplayName(
  firstName: string | undefined,
  lastName: string | undefined
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();

  if (!first && !last) return 'Guest';

  return last ? `${first} ${last.slice(0, 1)}.`.trim() : first;
}
