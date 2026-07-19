import { HDate, months } from '@hebcal/core';

export interface HebrewDateInfo {
  day: number;
  month: number;
  monthName: string;
  year: number;
  display: string;
}

/**
 * Convert a Gregorian date to Hebrew date info.
 */
export function toHebrewDate(date: Date): HebrewDateInfo {
  const hd = new HDate(date);
  return {
    day: hd.getDate(),
    month: hd.getMonth(),
    monthName: hd.getMonthName(),
    year: hd.getFullYear(),
    display: hd.render('he'),
  };
}

/**
 * Get the Gregorian date for a given Hebrew date.
 */
export function fromHebrewDate(day: number, month: number, year: number): Date {
  const hd = new HDate(day, month, year);
  return hd.greg();
}

/**
 * Get the same Hebrew date in the next Hebrew month.
 * Used for Veset HaChodesh calculation.
 */
export function sameHebrewDateNextMonth(date: Date): Date {
  const hd = new HDate(date);
  const day = hd.getDate();
  let month = hd.getMonth();
  let year = hd.getFullYear();

  // Advance to next month
  if (month === months.ELUL) {
    month = months.TISHREI;
    year += 1;
  } else if (month === months.ADAR_I && HDate.isLeapYear(year)) {
    month = months.ADAR_II;
  } else if (month === months.ADAR_II || (month === months.ADAR_I && !HDate.isLeapYear(year))) {
    month = months.NISAN;
  } else {
    month += 1;
  }

  // Clamp day if the next month has fewer days
  const nextMonth = new HDate(1, month, year);
  const daysInMonth = nextMonth.daysInMonth();
  const clampedDay = Math.min(day, daysInMonth);

  return fromHebrewDate(clampedDay, month, year);
}

// Hebrew numeral letters for days 1-30
const H_ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const H_TENS = ['', 'י', 'כ', 'ל'];

/**
 * Convert a Hebrew calendar day (1-30) to Hebrew letter notation.
 * e.g. 1→א׳  10→י׳  15→ט״ו  25→כ״ה  30→ל׳
 */
export function toHebrewNumeral(n: number): string {
  if (n === 15) return 'ט״ו'; // avoid divine name יה
  if (n === 16) return 'ט״ז'; // avoid divine name יו

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const letters = H_TENS[tens] + H_ONES[ones];

  if (letters.length === 1) return letters + '׳';         // single letter → geresh
  return letters[0] + '״' + letters.slice(1);             // two letters → gershayim
}

/**
 * Format a date as YYYY-MM-DD using LOCAL time (not UTC).
 * toISOString() is UTC-based and causes off-by-one errors in UTC+ timezones.
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
