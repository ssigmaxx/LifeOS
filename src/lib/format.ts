// Shared display formatters for the lifestyle-metric cards.

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMl(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${liters % 1 === 0 ? liters.toFixed(0) : liters.toFixed(1)} L`;
  }
  return `${ml} ml`;
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
