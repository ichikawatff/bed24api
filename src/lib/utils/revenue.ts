import type { Beds24Booking } from "@/lib/beds24";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CANCELLED_STATUSES = new Set(["0", "cancelled", "canceled"]);

function parseCalendarDate(value: string, label: string): Date {
  const parts = value.split("-").map((part) => Number(part));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date.`);
  }

  const [year, month, day] = parts;
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (parsedDate.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a valid YYYY-MM-DD date.`);
  }

  return parsedDate;
}

function formatCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getStayDates(checkinDate: string, checkoutDate: string): string[] {
  const arrivalDate = parseCalendarDate(checkinDate, "checkinDate");
  const departureDate = parseCalendarDate(checkoutDate, "checkoutDate");
  const diffMs = departureDate.getTime() - arrivalDate.getTime();
  const nights = diffMs > 0 ? Math.round(diffMs / ONE_DAY_MS) : 1;

  return Array.from({ length: nights }, (_, index) =>
    formatCalendarDate(new Date(arrivalDate.getTime() + index * ONE_DAY_MS)),
  );
}

function allocateDailyAmounts(totalAmount: number, nights: number): number[] {
  if (nights <= 0) {
    return [];
  }

  const totalCents = Math.round(totalAmount * 100);
  const sign = totalCents < 0 ? -1 : 1;
  const absoluteCents = Math.abs(totalCents);
  const baseCents = Math.floor(absoluteCents / nights);
  const remainder = absoluteCents % nights;

  return Array.from({ length: nights }, (_, index) => {
    const cents = baseCents + (index < remainder ? 1 : 0);
    return (cents * sign) / 100;
  });
}

export async function syncBookingAndRevenue(bookingData: Beds24Booking) {
  if (!bookingData.arrival || !bookingData.departure) {
    throw new Error("Beds24 booking is missing arrival or departure date.");
  }

  const supabase = getServiceSupabase();
  const beds24BookingId = String(bookingData.id);
  const propertyId =
    bookingData.propertyId != null ? String(bookingData.propertyId) : "unknown";
  const roomId =
    bookingData.roomId != null ? String(bookingData.roomId) : "unknown";
  const guestName =
    `${bookingData.firstName ?? ""} ${bookingData.lastName ?? ""}`.trim() || null;
  const checkinDate = bookingData.arrival;
  const checkoutDate = bookingData.departure;
  const rawStatus = String(bookingData.status ?? "0");
  const normalizedStatus = rawStatus.trim().toLowerCase();
  const parsedTotalAmount = Number(bookingData.price ?? 0);
  const totalAmount = Number.isFinite(parsedTotalAmount) ? parsedTotalAmount : 0;
  const stayDates = getStayDates(checkinDate, checkoutDate);
  const nights = stayDates.length;
  const timestamp = new Date().toISOString();

  const bookingPayload: Database["public"]["Tables"]["bookings"]["Insert"] = {
    beds24_booking_id: beds24BookingId,
    property_id: propertyId,
    room_id: roomId,
    guest_name: guestName,
    checkin_date: checkinDate,
    checkout_date: checkoutDate,
    ota_name: bookingData.apiSource?.trim() || "Direct",
    status: rawStatus,
    total_amount: totalAmount,
    nights,
    updated_at: timestamp,
  };

  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .upsert(bookingPayload, { onConflict: "beds24_booking_id" })
    .select("id")
    .single();

  if (bookingError || !bookingRow) {
    console.error("Supabase Bookings Upsert Error:", bookingError);
    throw new Error("Failed to sync booking data.");
  }

  const { error: deleteError } = await supabase
    .from("daily_revenues")
    .delete()
    .eq("beds24_booking_id", beds24BookingId);

  if (deleteError) {
    console.error("Supabase Daily Revenue Delete Error:", deleteError);
    throw new Error("Failed to clear previous daily revenues.");
  }

  if (CANCELLED_STATUSES.has(normalizedStatus)) {
    return { success: true, message: "Booking cancelled, revenue removed." };
  }

  const dailyAmounts = allocateDailyAmounts(totalAmount, nights);
  const revenueRows: Database["public"]["Tables"]["daily_revenues"]["Insert"][] =
    stayDates.map((targetDate, index) => ({
      booking_id: bookingRow.id,
      beds24_booking_id: beds24BookingId,
      target_date: targetDate,
      daily_amount: dailyAmounts[index] ?? 0,
      updated_at: timestamp,
    }));

  if (revenueRows.length > 0) {
    const { error: revenueError } = await supabase
      .from("daily_revenues")
      .insert(revenueRows);

    if (revenueError) {
      console.error("Supabase Daily Revenue Insert Error:", revenueError);
      throw new Error("Failed to insert daily revenues.");
    }
  }

  return { success: true, bookingId: bookingRow.id };
}
