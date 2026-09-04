import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

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

// NOTE: once the hosted Supabase project exists, replace this with a
// generated `Database` type (`supabase gen types typescript --project-id ...`)
// and pass it as createClient<Database>(...) for full query typing.
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient {
  const configured = isSupabaseConfigured(url, anonKey);
  if (!configured) {
    console.warn(
      "Supabase is not configured — using a placeholder client. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(configured ? url : PLACEHOLDER_URL, configured ? anonKey : PLACEHOLDER_ANON_KEY, options);
}

export type { SupabaseClient } from "@supabase/supabase-js";
