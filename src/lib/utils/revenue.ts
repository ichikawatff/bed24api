import { getServiceSupabase } from "@/lib/supabase/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export async function syncBookingAndRevenue(bookingData: any) {
  const supabase = getServiceSupabase();
  const beds24BookingId = bookingData.id.toString();

  // Beds24のデータから必要な項目を抽出
  // APIV2レスポンスの構造に合わせる(V2仕様に準拠)
  const propertyId = bookingData.propertyId?.toString() || "unknown";
  const roomId = bookingData.roomId?.toString() || "unknown";
  const guestName = `${bookingData.firstName || ""} ${bookingData.lastName || ""}`.trim();
  const checkinDate = bookingData.arrival; // YYYY-MM-DD format
  const checkoutDate = bookingData.departure;
  const status = bookingData.status?.toString() || "0"; 
  const totalAmount = Number(bookingData.price) || 0;
  
  const arrivalDate = parseISO(checkinDate);
  const departureDate = parseISO(checkoutDate);
  
  // 宿泊日数の計算
  // (チェックアウト日は宿泊日には含まれないため、departureDateから1日引くか、eachDayOfIntervalを工夫する)
  const diffTime = Math.abs(departureDate.getTime() - arrivalDate.getTime());
  let nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (nights <= 0) nights = 1;

  // 1. Bookings テーブルの UPSERT
  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .upsert({
      beds24_booking_id: beds24BookingId,
      property_id: propertyId,
      room_id: roomId,
      guest_name: guestName,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      ota_name: bookingData.apiSource || "Direct",
      status: status,
      total_amount: totalAmount,
      nights: nights,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'beds24_booking_id' })
    .select()
    .single();

  if (bookingError || !bookingRow) {
    console.error("Supabase Bookings Upsert Error:", bookingError);
    throw new Error("Failed to sync booking data.");
  }

  const generatedBookingId = bookingRow.id;

  // 2. Daily Revenues テーブルの再構築
  // 過去の該当予約の日割りデータを一度削除（キャンセルや変更にも対応するため）
  await supabase
    .from("daily_revenues")
    .delete()
    .eq("beds24_booking_id", beds24BookingId);

  // ステータスがキャンセル('0' または キャンセルを意味する値)の場合は日割りを登録しない
  if (status === "0" || status === "cancelled") {
    return { success: true, message: "Booking cancelled, revenue removed." };
  }

  // 宿泊日の配列を生成 (チェックイン日 〜 チェックアウト前日)
  const departureMinusOne = new Date(departureDate);
  departureMinusOne.setDate(departureMinusOne.getDate() - 1);
  
  // 予約が日帰りの場合などのフォールバック
  const intervalEnd = departureMinusOne < arrivalDate ? arrivalDate : departureMinusOne;

  const days = eachDayOfInterval({
    start: arrivalDate,
    end: intervalEnd,
  });

  const dailyAmount = Number((totalAmount / nights).toFixed(2));

  // バルクインサート用の配列を作成
  const revenueRows = days.map((day) => {
    return {
      booking_id: generatedBookingId,
      beds24_booking_id: beds24BookingId,
      target_date: format(day, "yyyy-MM-dd"), // JSTなど考慮したフォーマット
      daily_amount: dailyAmount,
    };
  });

  if (revenueRows.length > 0) {
    const { error: revenueError } = await supabase
      .from("daily_revenues")
      .insert(revenueRows);

    if (revenueError) {
      console.error("Supabase Daily Revenue Insert Error:", revenueError);
      throw new Error("Failed to insert daily revenues.");
    }
  }

  return { success: true, bookingId: generatedBookingId };
}
