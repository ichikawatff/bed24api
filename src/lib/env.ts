import { addYears, format } from "date-fns";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type Beds24SyncWindow = {
  arrivalFrom: string;
  arrivalTo: string;
};

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function assertIsoDate(value: string, label: string): string {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new RangeError(`${label} must be in YYYY-MM-DD format.`);
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new RangeError(`${label} must be a valid calendar date.`);
  }

  if (parsedDate.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`${label} must be a valid calendar date.`);
  }

  return value;
}

export function resolveBeds24SyncWindow(
  overrides: Partial<Beds24SyncWindow> = {},
): Beds24SyncWindow {
  const arrivalFrom = assertIsoDate(
    overrides.arrivalFrom ??
      getOptionalEnv("BEDS24_SYNC_START_DATE") ??
      "2021-01-01",
    "arrivalFrom",
  );

  const arrivalTo = assertIsoDate(
    overrides.arrivalTo ??
      getOptionalEnv("BEDS24_SYNC_END_DATE") ??
      format(addYears(new Date(), 2), "yyyy-MM-dd"),
    "arrivalTo",
  );

  if (arrivalFrom > arrivalTo) {
    throw new RangeError("arrivalFrom must be before or equal to arrivalTo.");
  }

  return { arrivalFrom, arrivalTo };
}
