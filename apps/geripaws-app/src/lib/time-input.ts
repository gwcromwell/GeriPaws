/**
 * Parses a loosely-formatted time-of-day string into strict 24-hour "HH:MM",
 * accepting whatever a caregiver is likely to type: "0800", "800", "08:00",
 * "8:00 am", "8:00pm", "8 pm". Returns null if it can't make sense of it.
 */
export function parseTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const meridiemMatch = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*([ap])\.?m?\.?$/i);
  if (meridiemMatch) {
    let hour = parseInt(meridiemMatch[1], 10);
    const minute = meridiemMatch[2] ? parseInt(meridiemMatch[2], 10) : 0;
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const isPM = meridiemMatch[3].toLowerCase() === 'p';
    if (hour === 12) hour = 0;
    if (isPM) hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const hour = parseInt(colonMatch[1], 10);
    const minute = parseInt(colonMatch[2], 10);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const digitsMatch = trimmed.match(/^(\d{1,4})$/);
  if (digitsMatch) {
    const digits = digitsMatch[1];
    let hour: number;
    let minute: number;
    if (digits.length <= 2) {
      hour = parseInt(digits, 10);
      minute = 0;
    } else if (digits.length === 3) {
      hour = parseInt(digits.slice(0, 1), 10);
      minute = parseInt(digits.slice(1), 10);
    } else {
      hour = parseInt(digits.slice(0, 2), 10);
      minute = parseInt(digits.slice(2), 10);
    }
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return null;
}
