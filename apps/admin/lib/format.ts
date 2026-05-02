// Local price formatter for the admin app. Mirrors the convention in
// packages/shared but kept inline to avoid a new top-level dep wiring.

export function formatPrice(amount: number | string | null | undefined, currency: string = "INR"): string {
  const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
  if (!Number.isFinite(n as number)) return "—";
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n as number);
  } catch {
    return `${currency} ${(n as number).toLocaleString()}`;
  }
}
