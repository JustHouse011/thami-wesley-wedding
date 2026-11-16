export function isRsvpEmail(value: string) {
  const separator = value.indexOf('@');
  const local = value.slice(0, separator);
  return separator > 0 && separator <= 64 && value.length <= 254
    && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..')
    && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(value);
}
