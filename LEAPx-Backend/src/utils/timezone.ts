/**
 * Timezone utilities for Thai time (UTC+7) ↔ UTC conversion.
 *
 * Convention:
 *  - The frontend always sends times in **Thai local time** (UTC+7), either
 *    as a plain ISO-like string without timezone (e.g. "2025-11-15T20:00:00")
 *    or with an explicit +07:00 offset.
 *  - The database always stores **UTC**.
 *  - API responses always return times as **Thai time** with a +07:00 offset.
 */

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 in milliseconds

/**
 * Convert a Thai time string (UTC+7) to a UTC `Date` for database storage.
 *
 * Rules:
 *  - If the string already carries explicit timezone info (trailing `Z` or
 *    `+HH:MM` / `-HH:MM`), it is parsed as-is — the caller is responsible for
 *    ensuring the offset is correct.
 *  - Otherwise the string is treated as a wall-clock time in Bangkok (UTC+7)
 *    and 7 hours are subtracted to produce UTC.
 *
 * @throws {Error} if the string cannot be parsed into a valid Date.
 */
export function thaiToUTC(dateStr: string): Date {
    const trimmed = dateStr.trim();

    // String already has explicit timezone info — parse as-is
    if (/Z$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        if (isNaN(d.getTime())) throw new Error(`Invalid date string: "${dateStr}"`);
        return d;
    }

    // No timezone info → treat as UTC+7 (Bangkok).
    // new Date("2025-11-15T20:00:00") parses the digits literally as UTC,
    // so we subtract 7 h to convert to real UTC.
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) throw new Error(`Invalid date string: "${dateStr}"`);
    return new Date(d.getTime() - TZ_OFFSET_MS);
}

/**
 * Convert a UTC `Date` from the database to a Thai time ISO string (+07:00).
 *
 * Returns `null` for falsy input so the function is safe to use on nullable
 * Prisma DateTime fields.
 */
export function utcToThai(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date as string);
    if (isNaN(d.getTime())) return null;
    const thaiTime = new Date(d.getTime() + TZ_OFFSET_MS);
    return thaiTime.toISOString().replace("Z", "+07:00");
}

/**
 * Recursively transform **every** `Date` instance inside a JSON-serialisable
 * value to a Thai time string (+07:00).
 *
 * Safe to use on any Prisma query result before passing it to
 * `NextResponse.json()`.  All non-Date values (strings, numbers, booleans,
 * nulls) are left untouched.
 */
export function transformDatesToThai<T>(data: T): T {
    if (data === null || data === undefined) return data;
    if (data instanceof Date) return utcToThai(data) as unknown as T;
    if (Array.isArray(data)) {
        return data.map((item) => transformDatesToThai(item)) as unknown as T;
    }
    if (typeof data === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(
            data as Record<string, unknown>
        )) {
            result[key] = transformDatesToThai(value);
        }
        return result as T;
    }
    return data;
}
