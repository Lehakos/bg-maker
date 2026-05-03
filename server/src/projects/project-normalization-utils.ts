export function normalizeFiniteNumber(
  value: unknown,
  fallback: number,
  bounds: { max: number; min: number }
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function normalizeIntegerNumber(
  value: unknown,
  fallback: number,
  bounds: { max: number; min: number }
) {
  return Math.round(normalizeFiniteNumber(value, fallback, bounds));
}

export function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return /^#[0-9a-fA-F]{6}$/.test(trimmedValue) ? trimmedValue.toLowerCase() : fallback;
}

export function hasOwnRecordKey(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
