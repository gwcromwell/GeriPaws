import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// A syntactically valid placeholder so an unconfigured client can still be
// constructed (network calls against it will fail, which callers already
// handle via try/catch) instead of throwing at import time. Throwing here
// would crash Expo Router's web route discovery, which imports every route
// module up front to build the route tree, before any screen — even an
// error screen — gets a chance to render.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON_KEY = "placeholder-anon-key";

export function isSupabaseConfigured(url: string | undefined, anonKey: string | undefined): boolean {
  return Boolean(url && anonKey);
}

export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient<Database> {
  const configured = isSupabaseConfigured(url, anonKey);
  if (!configured) {
    console.warn(
      "Supabase is not configured — using a placeholder client. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient<Database>(configured ? url : PLACEHOLDER_URL, configured ? anonKey : PLACEHOLDER_ANON_KEY, options);
}

export type { SupabaseClient } from "@supabase/supabase-js";
export type { Database, Json } from "./database.types";
