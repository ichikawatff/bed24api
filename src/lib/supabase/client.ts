import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// フロントエンド（ブラウザ）や読み取りなどで使う一般的なクライアント
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// サーバーサイド(API Routes/Webhook)からの管理者用更新クライアント
// ※ SERVICE_ROLE_KEY は絶対にブラウザに露出させないこと
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createClient<Database>(supabaseUrl, serviceKey);
};
