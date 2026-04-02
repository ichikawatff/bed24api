import { NextResponse } from "next/server";
import { getAllBookingsFromBeds24 } from "@/lib/beds24";
import { syncBookingAndRevenue } from "@/lib/utils/revenue";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 実行タイムアウトを伸ばす（一括同期で時間がかかる場合）

export async function GET() {
  try {
    console.log("[Sync] Fetching all bookings from Beds24...");
    const bookings = await getAllBookingsFromBeds24();
    
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: "No bookings found in Beds24." });
    }

    let successCount = 0;
    let errorCount = 0;

    console.log(`[Sync] Found ${bookings.length} bookings to sync.`);

    for (const booking of bookings) {
      try {
        await syncBookingAndRevenue(booking);
        successCount++;
      } catch (e: any) {
        console.error(`[Sync] Error for booking ${booking.id}: ${e.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Sync Complete",
      total: bookings.length,
      successCount,
      errorCount
    });

  } catch (error: any) {
    console.error("[Sync Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
