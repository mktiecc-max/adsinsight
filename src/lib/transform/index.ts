export function phoneVN(raw: string) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 9) return { phone: null, status: "invalid" as const };
  const phone = digits.slice(-9);
  if (!/^[35789]/.test(phone)) return { phone: null, status: "invalid" as const };
  return { phone, status: "valid" as const };
}

export function numberVN(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const value = raw
    .replace(/[₫%]/g, "")
    .replace(/VND/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Số không hợp lệ: ${raw}`);
  return parsed;
}

export function parseCampaignName(raw: string) {
  const [owner, brand, objective, ...rest] = raw.split("/").map((part) => part.trim());
  if (!owner || !brand || !objective || !rest.length) {
    return { owner: "", brand: "", objective: "", theme: raw, parseStatus: "unparsed" as const };
  }
  return {
    owner,
    brand: brand.toLowerCase(),
    objective,
    theme: rest.join("/"),
    parseStatus: "ok" as const,
  };
}

export function normalizeCreative(raw: string) {
  return raw.replace(/\s*-\s*Bản sao(\s*\d+)?\s*$/gi, "").trim().toLowerCase();
}
