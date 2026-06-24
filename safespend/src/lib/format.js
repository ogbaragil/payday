// Formatting helpers — currency + dates. Pure functions, no side effects.

const CURRENCY_LOCALE = {
  AUD: "en-AU",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  NZD: "en-NZ",
  CAD: "en-CA",
};

export const CURRENCIES = [
  { code: "AUD", symbol: "$", label: "Australian Dollar" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "NZD", symbol: "$", label: "New Zealand Dollar" },
  { code: "CAD", symbol: "$", label: "Canadian Dollar" },
];

export function formatMoney(amount, currency = "AUD", opts = {}) {
  const value = Number.isFinite(amount) ? amount : 0;
  const locale = CURRENCY_LOCALE[currency] || "en-AU";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(value);
}

// Whole-dollar version for big hero numbers
export function formatMoneyRound(amount, currency = "AUD") {
  return formatMoney(Math.round(amount), currency, { cents: false });
}

export function currencySymbol(currency = "AUD") {
  return CURRENCIES.find((c) => c.code === currency)?.symbol || "$";
}

// --- Dates -------------------------------------------------------------

export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function today() {
  return startOfDay(new Date());
}

// Whole days from a -> b (b minus a). Positive if b is in the future.
export function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / 86400000);
}

export function addDays(date, days) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = startOfDay(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

export function formatDate(date, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-AU", opts).format(new Date(date));
}

export function formatDateLong(date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

// Friendly relative label for a due date
export function relativeDay(date) {
  const diff = daysBetween(today(), date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

// Compact "time ago" for sync timestamps.
export function relativeTime(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(date, { day: "numeric", month: "short" });
}

export function cycleLengthDays(frequency) {
  if (frequency === "weekly") return 7;
  if (frequency === "fortnightly") return 14;
  return 30; // monthly — nominal, real length derived from actual payday dates
}

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};
