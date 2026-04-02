-- ==========================================
-- Beds24 API 連携用 Supabase DB スキーマ
-- ==========================================

-- 1. properties_inventory テーブル（部屋ごとの在庫カレンダー・料金）
CREATE TABLE IF NOT EXISTS public.properties_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beds24_property_id TEXT NOT NULL,
  beds24_room_id TEXT NOT NULL,
  target_date DATE NOT NULL,
  available_flag BOOLEAN DEFAULT false,
  price NUMERIC,
  min_stay INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(beds24_room_id, target_date)
);

-- 2. bookings テーブル（予約マスター）
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beds24_booking_id TEXT UNIQUE NOT NULL,
  property_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  guest_name TEXT,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  ota_name TEXT,
  status TEXT, -- 例: '0' (Cancelled), '1' (Confirmed), '2' (New) などBeds24の仕様に合わせる
  total_amount NUMERIC,
  nights INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. daily_revenues テーブル（日割り売上、ダッシュボードグラフ用）
-- 一つの予約を宿泊日数分に分割して保存するテーブル
CREATE TABLE IF NOT EXISTS public.daily_revenues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  beds24_booking_id TEXT NOT NULL,
  target_date DATE NOT NULL,
  daily_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(beds24_booking_id, target_date)
);
