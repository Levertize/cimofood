import { createBrowserClient } from "@supabase/ssr";
import { cleanEnvValue, normalizeSupabaseUrl } from "./config";

export function createSupabaseBrowserClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) {
    throw new Error("Supabase env vars belum dikonfigurasi.");
  }
  return createBrowserClient(url, anonKey);
}
