/**
 * Flatten a shipping address for display. The API sends it as an object
 * ({ name, line1, city, state, pincode, ... }) and rendering that directly
 * crashed /store-admin/orders ("Objects are not valid as a React child").
 */
export function addressText(a: unknown): string {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a !== 'object') return String(a);
  const o = a as Record<string, unknown>;
  return ['name', 'line1', 'line2', 'landmark', 'city', 'state', 'pincode', 'country', 'phone']
    .map((k) => o[k])
    .filter((v) => (typeof v === 'string' && v.trim() !== '') || typeof v === 'number')
    .join(', ');
}
