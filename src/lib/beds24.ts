import {
  getRequiredEnv,
  resolveBeds24SyncWindow,
  type Beds24SyncWindow,
} from "@/lib/env";
import { getErrorMessage, sleep } from "@/lib/errors";

export const BEDS24_API_URL = "https://api.beds24.com/v2";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export type Beds24Booking = {
  id: string | number;
  propertyId?: string | number | null;
  roomId?: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
  arrival: string;
  departure: string;
  status?: string | number | null;
  price?: string | number | null;
  apiSource?: string | null;
};

type Beds24CollectionResponse<T> = {
  data?: T[];
};

function getRetryDelayMs(response: Response | null, attempt: number): number {
  const resetSeconds = Number(
    response?.headers.get("x-five-min-limit-resets-in"),
  );

  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return Math.min(resetSeconds * 1000, 30_000);
  }

  return Math.min(1_000 * 2 ** attempt, 8_000);
}

async function beds24Fetch<T>(
  path: string,
  searchParams?: URLSearchParams,
): Promise<T[]> {
  const token = getRequiredEnv("BEDS24_API_KEY");
  const url = searchParams?.size
    ? `${BEDS24_API_URL}${path}?${searchParams.toString()}`
    : `${BEDS24_API_URL}${path}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          token,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.ok) {
        const payload =
          (await response.json()) as Beds24CollectionResponse<T>;
        return payload.data ?? [];
      }

      const responseText = await response.text();
      const message = `Beds24 API request failed (${response.status} ${response.statusText}): ${responseText}`;

      if (
        !RETRYABLE_STATUS_CODES.has(response.status) ||
        attempt === MAX_ATTEMPTS - 1
      ) {
        throw new Error(message);
      }

      await sleep(getRetryDelayMs(response, attempt));
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new Error(`Beds24 API request failed: ${getErrorMessage(error)}`);
      }

      await sleep(getRetryDelayMs(null, attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return [];
}

export async function getBookingFromBeds24(
  bookingId: string,
): Promise<Beds24Booking | null> {
  const searchParams = new URLSearchParams({ id: bookingId });
  const [booking] = await beds24Fetch<Beds24Booking>("/bookings", searchParams);
  return booking ?? null;
}

export async function getAllBookingsFromBeds24(
  windowOverrides: Partial<Beds24SyncWindow> = {},
): Promise<Beds24Booking[]> {
  const { arrivalFrom, arrivalTo } = resolveBeds24SyncWindow(windowOverrides);
  const searchParams = new URLSearchParams({ arrivalFrom, arrivalTo });

  return beds24Fetch<Beds24Booking>("/bookings", searchParams);
}
