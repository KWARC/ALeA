/**
 * Weekday names in JavaScript Date.getDay() order (Sunday = 0, Monday = 1, ..., Saturday = 6)
 */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Weekday names in a more common order (Monday first, Sunday last)
 * Useful for UI dropdowns and displays
 */
export const WEEKDAYS_UI_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type WeekdayName = typeof WEEKDAYS[number];

/**
 * Maps weekday name to JavaScript Date.getDay() index (Sunday = 0, Monday = 1, ..., Saturday = 6)
 * @param weekday - Weekday name (e.g., "Monday", "Sunday")
 * @returns Weekday index (0-6) or undefined if invalid
 */
export function toWeekdayIndex(weekday: string): number | undefined {
  const index = WEEKDAYS.indexOf(weekday as WeekdayName);
  return index === -1 ? undefined : index;
}

/**
 * Gets weekday name from JavaScript Date.getDay() index
 * @param index - Weekday index (0-6, where 0 = Sunday)
 * @returns Weekday name or undefined if invalid
 */
export function fromWeekdayIndex(index: number): WeekdayName | undefined {
  if (index < 0 || index >= WEEKDAYS.length) {
    return undefined;
  }
  return WEEKDAYS[index];
}

/**
 * Parses a time string in "HH:MM" format to hours and minutes
 * @param timeString - Time string in "HH:MM" format (e.g., "14:30")
 * @returns Tuple of [hours, minutes] as numbers, or undefined if invalid
 */
export function parseTimeString(timeString: string): [number, number] | undefined {
  const parts = timeString.split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return undefined;
  }
  return [parts[0], parts[1]];
}

