import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient, isSupabaseConfigured } from "@geripaws/shared";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isConfigured = isSupabaseConfigured(supabaseUrl, supabaseAnonKey);

// Web already persists sessions via localStorage by default; native needs an
// explicit AsyncStorage adapter.
const storage = Platform.OS === "web" ? undefined : AsyncStorage;

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Supabase's token auto-refresh timer keeps running in the background unless
// paused/resumed with app foreground state — required on native, harmless on web.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
