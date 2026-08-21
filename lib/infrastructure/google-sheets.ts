import "server-only";

import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: CachedToken | null = null;

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function readServiceAccount(): ServiceAccount | null {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (process.env.ADSINSIGHT_DATA_MODE === "live" && !encoded) {
    throw new Error("ADSINSIGHT_DATA_MODE=live nhưng thiếu GOOGLE_SERVICE_ACCOUNT_B64.");
  }
  if (!encoded || process.env.ADSINSIGHT_DATA_MODE === "demo") return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("Thiếu client_email hoặc private_key.");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON không hợp lệ.";
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_B64 không hợp lệ: ${message}`);
  }
}

async function getAccessToken(account: ServiceAccount) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;

  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encodeBase64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${encodeBase64Url(signer.sign(account.private_key))}`;

  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google OAuth trả về ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
  };
  return tokenCache.accessToken;
}

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_B64 && process.env.ADSINSIGHT_DATA_MODE !== "demo");
}

export function extractSpreadsheetId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || trimmed;
}

async function googleSheetsFetch<T>(path: string) {
  const account = readServiceAccount();
  if (!account) return null;

  const accessToken = await getAccessToken(account);
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets trả về ${response.status}: ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

export async function inspectSpreadsheet(spreadsheetValue: string, range?: string) {
  const spreadsheetId = extractSpreadsheetId(spreadsheetValue);
  const metadata = await googleSheetsFetch<{
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string; gridProperties?: { rowCount?: number } } }>;
  }>(
    `spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties(title,gridProperties.rowCount)`,
  );
  if (!metadata) return null;

  const selectedRange = range || metadata.sheets?.[0]?.properties?.title || "A1:Z10";
  const values = await googleSheetsFetch<{ range: string; values?: unknown[][] }>(
    `spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(selectedRange)}`,
  );

  return {
    spreadsheet_id: spreadsheetId,
    title: metadata.properties?.title || spreadsheetId,
    tabs:
      metadata.sheets?.map((sheet) => ({
        title: sheet.properties?.title || "Sheet",
        row_count: sheet.properties?.gridProperties?.rowCount || 0,
      })) || [],
    range: values?.range || selectedRange,
    headers: (values?.values?.[0] || []).map(String),
    sample: (values?.values || []).slice(1, 6),
  };
}
