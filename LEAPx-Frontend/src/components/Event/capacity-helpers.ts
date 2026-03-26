export type LimitMode = "UNLIMITED" | "LIMITED" | "CLOSED";

export const UNLIMITED_VALUE = 1_000_000;
export const MIN_LIMIT = 1;

export function inferModeFromValue(v: number | null | undefined): LimitMode {
  if (v == null || v === 0) return "CLOSED";
  if (v >= UNLIMITED_VALUE) return "UNLIMITED";
  return "LIMITED";
}

export function normalizeForBackend(mode: LimitMode, n?: number): number {
  if (mode === "UNLIMITED") return UNLIMITED_VALUE;
  if (mode === "CLOSED") return 0;
  const safe =
    Number.isFinite(n!) && (n as number) >= MIN_LIMIT ? (n as number) : MIN_LIMIT;
  return safe;
}

export function formatDisplay(v: number | null | undefined, placeholder?: string) {
  if (v == null) return placeholder ?? "";
  if (v === 0) return "ไม่เปิดรับ";
  if (v >= UNLIMITED_VALUE) return "ไม่จำกัด";
  return `${v}`;
}
