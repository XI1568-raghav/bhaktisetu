/**
 * Join place parts into one label, skipping empty/null parts so an empty city
 * never renders as ", Telangana" or "QA E2E Temple,".
 */
export function placeLabel(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ');
}
