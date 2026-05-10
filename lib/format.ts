export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRPlain(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

export function discountPercent(price: number, discount: number | null | undefined): number | null {
  if (!discount || discount >= price) return null;
  return Math.round(((price - discount) / price) * 100);
}
