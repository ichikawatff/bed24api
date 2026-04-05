import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

import { getOptionalEnv } from "@/lib/env";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function hasValidSecret(
  request: NextRequest,
  envName: string,
  headerNames: string[] = [],
): boolean {
  const expectedSecret = getOptionalEnv(envName);

  if (!expectedSecret) {
    return true;
  }

  const candidates = [
    getBearerToken(request.headers.get("authorization")),
    request.nextUrl.searchParams.get("secret"),
    ...headerNames.map((headerName) => request.headers.get(headerName)),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  return candidates.some((candidate) => safeEqual(candidate, expectedSecret));
}
