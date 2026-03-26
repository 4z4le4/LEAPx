/**
 * Date and time helper functions for event forms
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Format Date object to local date string (YYYY-MM-DD)
 */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Convert date and time to ISO 8601 string (Thai timezone)
 */
export function toISO(date: string, time: string): string {
  if (!date || !time) return ''

  const [year, month, day] = date.split('-').map(Number)

  let y = year
  if (y > 2400) {
    y -= 543
  }

  const normalizedDate = `${y}-${pad2(month)}-${pad2(day)}`
  const dt = new Date(`${normalizedDate}T${time}:00+07:00`)

  return dt.toISOString()
}

/**
 * Parse backend ISO datetime to Thai local date and time parts
 */
export function fromBackendToThaiParts(isoString: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!isoString) return { date: '', time: '' };

  try {
    const dt = new Date(isoString);
    
    // Convert to Thai timezone
    const thaiTime = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {

      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(dt);

    const parts: Record<string, string> = {};
    thaiTime.forEach((p) => {
      if (p.type !== 'literal') {
        parts[p.type] = p.value;
      }
    });

    // Format for HTML inputs
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;

    return { date, time };
  } catch (e) {
    console.error('Error parsing date:', e);
    return { date: '', time: '' };
  }
}

/**
 * Shift a datetime by specified minutes
 * Used for calculating check-in times
 */
export function shiftDateTime(
  date: string,
  time: string,
  minutes: number
): { date: string; time: string } {
  if (!date || !time) return { date: '', time: '' };

  try {
    const dt = new Date(`${date}T${time}:00+07:00`);
    dt.setMinutes(dt.getMinutes() + minutes);

    return fromBackendToThaiParts(dt.toISOString());
  } catch (e) {
    console.error('Error shifting datetime:', e);
    return { date: '', time: '' };
  }
}

/**
 * Get list of dates between start and end dates
 */
export function getDatesBetween(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];

  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Ensure valid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Format date to Thai display format
 */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Check if date1 is before date2
 */
export function isDateBefore(date1: string, date2: string): boolean {
  if (!date1 || !date2) return false;
  return new Date(date1) < new Date(date2);
}

/**
 * Check if datetime1 is before datetime2
 */
export function isDateTimeBefore(
  date1: string,
  time1: string,
  date2: string,
  time2: string
): boolean {
  if (!date1 || !time1 || !date2 || !time2) return false;
  
  const dt1 = new Date(`${date1}T${time1}:00`);
  const dt2 = new Date(`${date2}T${time2}:00`);
  
  return dt1 < dt2;
}
