/**
 * Audience selection helper functions
 */

export type AudienceKey = 'all' | 'eng' | 'y1' | 'y2' | 'y3' | 'y4';
export type YearKey = 'y1' | 'y2' | 'y3' | 'y4';

export const AUDIENCE: Record<AudienceKey, string> = {
  all: 'บุคคลทั่วไป',
  eng: 'นักศึกษาคณะวิศวกรรรมศาสตร์',
  y1: '1',
  y2: '2',
  y3: '3',
  y4: '4',
};

export const YEAR_KEYS: readonly YearKey[] = ['y1', 'y2', 'y3', 'y4'] as const;

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const isYear = (k: AudienceKey): k is YearKey => k.startsWith('y');

/**
 * Extract year numbers from audience keys
 */
export function extractYears(aud: AudienceKey[]): number[] {
  return YEAR_KEYS.filter((k) => aud.includes(k)).map((k) =>
    Number(k.slice(1))
  );
}

/**
 * Calculate next audience state when user clicks an audience chip
 */
export function nextAudience(
  prev: AudienceKey[],
  clicked: AudienceKey
): AudienceKey[] {
  // 1) Clicking "all" → only "all" remains
  if (clicked === 'all') {
    return ['all'];
  }

  // 2) Remove "all" when clicking anything else (all is exclusive)
  const base = prev.filter((k) => k !== 'all');
  const years = base.filter(isYear) as YearKey[];

  // 3) Clicking "Engineering students"
  if (clicked === 'eng') {
    const hasEng = base.includes('eng');

    if (hasEng) {
      // Remove "eng"
      const next = base.filter((k) => k !== 'eng');
      return next.length ? (uniq<AudienceKey>(next) as AudienceKey[]) : ['all'];
    }

    // Add "eng"
    return uniq<AudienceKey>(['eng', ...years]);
  }

  // 4) Clicking year → toggle
  const has = base.includes(clicked);
  const next = has ? base.filter((v) => v !== clicked) : [...base, clicked];

  // If nothing remains → return to "all"
  if (next.length === 0) {
    return ['all'];
  }

  return uniq<AudienceKey>(next as AudienceKey[]);
}

/**
 * Build audience selection from backend data
 */
export function buildAudienceFromBackend(
  years?: number[] | null,
  isForEng?: boolean
): AudienceKey[] {
  const ys = Array.isArray(years)
    ? years.filter((y) => [1, 2, 3, 4].includes(y))
    : [];

  // Not locked to Engineering
  if (!isForEng) {
    if (ys.length === 0) {
      return ['all'];
    }
    const chips = ys.map((y) => `y${y}` as AudienceKey);
    return chips.length ? chips : ['all'];
  }

  // Locked to Engineering
  const allYearKeys: YearKey[] = ['y1', 'y2', 'y3', 'y4'];
  const yearKeys =
    ys.length === 0 || ys.length === 4
      ? allYearKeys
      : ys.map((y) => `y${y}` as YearKey);

  return ['eng', ...yearKeys];
}

/**
 * Derive years and engineering flag from audience selection
 */
export function deriveAudience(aud: AudienceKey[]): {
  years: number[];
  isForEng: boolean;
} {
  const hasAll = aud.includes('all');
  const hasEng = aud.includes('eng');
  const ys = extractYears(aud);

  // "All" → no restrictions
  if (hasAll) {
    return { years: [], isForEng: false };
  }

  // Has "Engineering students"
  if (hasEng) {
    if (ys.length === 0) {
      return { years: [1, 2, 3, 4], isForEng: true };
    }
    return { years: ys, isForEng: true };
  }

  // Only years → not locked to Engineering
  return { years: ys, isForEng: false };
}
