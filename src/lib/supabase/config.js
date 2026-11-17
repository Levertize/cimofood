const PLACEHOLDER_PATTERNS = [
  /^your[-_]/i,
  /^sb-mid-(client|server)-your-/i,
  /^admin@email-kamu\.com$/i,
  /^admin@example\.com$/i,
  /^https?:\/\/your-project-id\.supabase\.co/i,
];

/**
 * Trims surrounding whitespace and matching quotes from an environment variable string.
 */
export function cleanEnvValue(rawValue) {
  return String(rawValue || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

/**
 * Checks whether an environment variable holds a non-empty, non-placeholder value.
 */
export function isRealEnvValue(rawValue) {
  const cleaned = cleanEnvValue(rawValue);
  if (!cleaned) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Normalizes a Supabase URL to its origin so trailing paths like /rest/v1 do not break Auth or Storage.
 */
export function normalizeSupabaseUrl(rawUrl) {
  const cleaned = cleanEnvValue(rawUrl);
  if (!isRealEnvValue(cleaned)) return "";
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

/**
 * Returns true when Supabase URL, anon/publishable key, and service key are all configured with real values.
 */
export function isSupabaseConfigured() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return Boolean(
    url &&
      isRealEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      isRealEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
