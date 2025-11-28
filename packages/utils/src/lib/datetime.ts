export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAYS_UI_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

export function toWeekdayIndex(weekday: string): number | undefined {
  const index = WEEKDAYS.indexOf(weekday as WeekdayName);
  return index === -1 ? undefined : index;
}

export function fromWeekdayIndex(index: number): WeekdayName | undefined {
  if (index < 0 || index >= WEEKDAYS.length) {
    return undefined;
  }
  return WEEKDAYS[index];
}

export function parseTimeString(timeString: string): [number, number] | undefined {
  const parts = timeString.split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return undefined;
  }
  return [parts[0], parts[1]];
}
