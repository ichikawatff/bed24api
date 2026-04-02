import { NextResponse } from "next/server";
import { getBookingFromBeds24 } from "@/lib/beds24";
import { syncBookingAndRevenue } from "@/lib/utils/revenue";

// Beds24からPOSTで送られてくるWebhookを処理するエンドポイント
export async function POST(request: Request) {
  try {
    // Webhookのペイロード（Beds24側のAuto Actionの設定で送信フォーマットを決める）
    // 例えば { "bookingId": "[BOOKID]" } のようなJSONが送られてくると想定する
    let payload;
    try {
      payload = await request.json();
    } catch {
      // JSONでパースできない場合、URLSearchParamsとしてパース（Beds24の仕様によって対応）
      const text = await request.text();
      const params = new URLSearchParams(text);
      payload = { bookingId: params.get("bookingId") || params.get("id") };
    }

    const bookingId = payload.bookingId || payload.id;
    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking ID in webhook payload." }, { status: 400 });
    }

    console.log(`[Webhook] Received update for booking: ${bookingId}`);

    // 最新の予約情報をBeds24から再取得する（情報欠損や不正リクエストを防ぐため）
    const bookingData = await getBookingFromBeds24(bookingId);
    
    if (!bookingData) {
      return NextResponse.json({ error: `Booking ${bookingId} not found in Beds24.` }, { status: 404 });
    }

    // 取得した予約データをSupabaseへ同期（日割り計算含む）
    await syncBookingAndRevenue(bookingData);

    return NextResponse.json({ success: true, message: `Booking ${bookingId} synchronized.` });
  } catch (error: any) {
    console.error("[Webhook Error]:", error.message);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// GETメソッドも念のためサポート（Beds24がGETパラメーターで飛ばす場合への対応）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId") || searchParams.get("id");

  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking ID." }, { status: 400 });
  }

  try {
    const bookingData = await getBookingFromBeds24(bookingId);
    if (!bookingData) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await syncBookingAndRevenue(bookingData);
    return NextResponse.json({ success: true, message: "Sync successful from GET." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
