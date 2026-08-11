export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${field} must be an object`);
  return value;
}

export function requireString(value: unknown, field: string): string {
  if (!isNonEmptyString(value)) throw new TypeError(`${field} must be a non-empty string`);
  return value;
}
