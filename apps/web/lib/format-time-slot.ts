/**
 * "06:00" -> "6:00 AM". Booking slots may also arrive as a range ("06:00-08:00"):
 * the start is shown. Splitting the whole string on ':' used to give "6:NaN".
 */
export function formatTime(time: string): string {
  const parts = (time.match(/^\d{1,2}:\d{2}/)?.[0] ?? time).split(':').map(Number);
  const h = Number.isFinite(parts[0]) ? (parts[0] as number) : 0;
  const m = Number.isFinite(parts[1]) ? (parts[1] as number) : 0;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
