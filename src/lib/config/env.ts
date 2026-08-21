export const env = {
  get SUPABASE_URL() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!val && process.env.NODE_ENV !== "test") {
      throw new Error("Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL");
    }
    return val || "";
  },
  get SUPABASE_ANON_KEY() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!val && process.env.NODE_ENV !== "test") {
      throw new Error("Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    return val || "";
  },
  get SUPABASE_SERVICE_KEY() {
    const val = process.env.SUPABASE_SECRET_KEY;
    if (!val && process.env.NODE_ENV !== "test" && process.env.ADSINSIGHT_DATA_MODE === "live") {
      throw new Error("Thiếu biến môi trường SUPABASE_SECRET_KEY trong chế độ live");
    }
    return val || "";
  },
  get GOOGLE_SERVICE_ACCOUNT_B64() {
    return process.env.GOOGLE_SERVICE_ACCOUNT_B64 || "";
  },
  get ANTHROPIC_API_KEY() {
    return process.env.ANTHROPIC_API_KEY || "";
  },
  get IS_LIVE() {
    return process.env.ADSINSIGHT_DATA_MODE === "live";
  },
  get IS_DEV() {
    return process.env.NODE_ENV === "development";
  },
  get IS_TEST() {
    return process.env.NODE_ENV === "test";
  }
};
