import { NextRequest, NextResponse } from "next/server";

import { getAllBookingsFromBeds24 } from "@/lib/beds24";
import { resolveBeds24SyncWindow } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { hasValidSecret } from "@/lib/security";
import { syncBookingAndRevenue } from "@/lib/utils/revenue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handleSync(request: NextRequest) {
  if (!hasValidSecret(request, "BEDS24_SYNC_API_SECRET", ["x-sync-secret"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const syncWindow = resolveBeds24SyncWindow({
      arrivalFrom: request.nextUrl.searchParams.get("arrivalFrom") ?? undefined,
      arrivalTo: request.nextUrl.searchParams.get("arrivalTo") ?? undefined,
    });

    console.log("[Sync] Fetching all bookings from Beds24...");
    const bookings = await getAllBookingsFromBeds24(syncWindow);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bookings found in Beds24.",
        window: syncWindow,
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const failures: Array<{ bookingId: string; error: string }> = [];

    console.log(`[Sync] Found ${bookings.length} bookings to sync.`);

    for (const booking of bookings) {
      try {
        await syncBookingAndRevenue(booking);
        successCount++;
      } catch (error) {
        const message = getErrorMessage(error);
        console.error(`[Sync] Error for booking ${booking.id}: ${message}`);
        errorCount++;
        failures.push({
          bookingId: String(booking.id),
          error: message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sync Complete",
      window: syncWindow,
      total: bookings.length,
      successCount,
      errorCount,
      failures,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = error instanceof RangeError ? 400 : 500;

    console.error("[Sync Error]:", message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
