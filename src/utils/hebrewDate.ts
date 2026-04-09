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

/**
 * Format a date as YYYY-MM-DD.
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}
