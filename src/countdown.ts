// The ceremony date is in Pretoria (UTC+02:00). Count down to local midnight.
export const WEDDING_DATE = Date.parse('2026-11-30T00:00:00+02:00');

export function timeRemaining(now = Date.now()) {
  const seconds = Math.max(0, Math.floor((WEDDING_DATE - now) / 1000));
  return [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
}
