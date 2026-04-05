import { NextRequest, NextResponse } from "next/server";

import { getBookingFromBeds24 } from "@/lib/beds24";
import { getErrorMessage } from "@/lib/errors";
import { hasValidSecret } from "@/lib/security";
import { syncBookingAndRevenue } from "@/lib/utils/revenue";

export const runtime = "nodejs";

type Beds24WebhookPayload = {
  bookingId?: string;
  booking_id?: string;
  id?: string;
};

function getStringValue(value: unknown): string | undefined {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function parseJsonPayload(rawBody: string): Beds24WebhookPayload {
  const parsedBody: unknown = JSON.parse(rawBody);

  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return {};
  }

  const body = parsedBody as Record<string, unknown>;

  return {
    bookingId: getStringValue(body.bookingId),
    booking_id: getStringValue(body.booking_id),
    id: getStringValue(body.id),
  };
}

function parseFormPayload(rawBody: string): Beds24WebhookPayload {
  if (!rawBody.includes("=")) {
    return {
      bookingId: getStringValue(rawBody),
    };
  }

  const params = new URLSearchParams(rawBody);

  return {
    bookingId: params.get("bookingId") ?? undefined,
    booking_id: params.get("booking_id") ?? undefined,
    id: params.get("id") ?? undefined,
  };
}

function parseWebhookPayload(
  rawBody: string,
  contentType: string | null,
): Beds24WebhookPayload {
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {};
  }

  if (contentType?.includes("application/json")) {
    return parseJsonPayload(trimmedBody);
  }

  if (
    contentType?.includes("application/x-www-form-urlencoded") ||
    contentType?.includes("text/plain")
  ) {
    return parseFormPayload(trimmedBody);
  }

  try {
    return parseJsonPayload(trimmedBody);
  } catch {
    return parseFormPayload(trimmedBody);
  }
}

function extractBookingId(payload: Beds24WebhookPayload): string | null {
  return payload.bookingId ?? payload.booking_id ?? payload.id ?? null;
}

async function syncBookingById(bookingId: string) {
  const bookingData = await getBookingFromBeds24(bookingId);

  if (!bookingData) {
    return NextResponse.json(
      { error: `Booking ${bookingId} not found in Beds24.` },
      { status: 404 },
    );
  }

  await syncBookingAndRevenue(bookingData);

  return NextResponse.json({
    success: true,
    message: `Booking ${bookingId} synchronized.`,
  });
}

export async function POST(request: NextRequest) {
  if (
    !hasValidSecret(request, "BEDS24_WEBHOOK_SECRET", [
      "x-beds24-webhook-secret",
      "x-webhook-secret",
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    const payload = parseWebhookPayload(
      rawBody,
      request.headers.get("content-type"),
    );
    const bookingId = extractBookingId(payload);

    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing booking ID in webhook payload." },
        { status: 400 },
      );
    }

    console.log(`[Webhook] Received update for booking: ${bookingId}`);

    return syncBookingById(bookingId);
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("[Webhook Error]:", message);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  if (
    !hasValidSecret(request, "BEDS24_WEBHOOK_SECRET", [
      "x-beds24-webhook-secret",
      "x-webhook-secret",
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId =
    request.nextUrl.searchParams.get("bookingId") ??
    request.nextUrl.searchParams.get("id");

  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking ID." }, { status: 400 });
  }

  try {
    return syncBookingById(bookingId);
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
