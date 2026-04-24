export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

export function pickDefined<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  keys: ReadonlyArray<keyof T>
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(body, k as string)) {
      out[k as string] = body[k as string];
    }
  }
  return out as Partial<T>;
}
