import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function createServerClient(apiKey: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getServerSupabase() {
  return createServerClient(supabaseAnonKey);
}

export function getServiceSupabase() {
  return createServerClient(getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
