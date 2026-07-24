const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatVnd(value: number | null, compact = true) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (!compact) return `${number.format(Math.round(value))} đ`;
  if (Math.abs(value) >= 1_000_000_000) return `${decimal.format(value / 1_000_000_000)} Tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${decimal.format(value / 1_000_000)} Tr`;
  if (Math.abs(value) >= 1_000) return `${number.format(Math.round(value / 1_000))} N`;
  return `${number.format(Math.round(value))} đ`;
}

export function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${decimal.format(value * 100)}%`;
}

export function formatCount(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return number.format(value);
}

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const phone = digits.slice(-9);
  return /^[35789]/.test(phone) ? phone : null;
}

export function displayPhone(raw: string) {
  const phone = normalizePhone(raw) ?? raw.replace(/\D/g, "");
  if (phone.length !== 9) return raw;
  return `0${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
}
