import {
  CalculationInput,
  CalculationResult,
  VesetDate,
  ProactiveAlert,
} from '../../types/halachic';
import { sameHebrewDateNextMonth, formatDateISO } from '../../utils/hebrewDate';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getHaflagah(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Core calculation engine.
 * Computes expected veset dates based on halachic profile (Sephardi/Ashkenazi).
 */
export function calculateVesetDates(input: CalculationInput): CalculationResult {
  const { startDate, onah, profile, previousCycles } = input;
  const vesetDates: VesetDate[] = [];

  // 1. Onah Beinonit — Day 30
  vesetDates.push({
    date: addDays(startDate, 29),
    type: 'onah_beinonit',
    onah,
    isFixed: false,
  });

  // 2. Or Zarua (Ashkenazi only) — Day 31
  if (profile === 'ashkenazi') {
    vesetDates.push({
      date: addDays(startDate, 30),
      type: 'or_zarua',
      onah,
      isFixed: false,
    });
  }

  // 3. Veset HaChodesh — Same Hebrew date next month (accurate Hebrew calendar)
  const vesetHaChodeshDate = sameHebrewDateNextMonth(new Date(startDate));
  vesetDates.push({
    date: formatDateISO(vesetHaChodeshDate),
    type: 'veset_hachodesh',
    onah,
    isFixed: false,
  });

  // 4. Veset HaHaflagah — Interval between last two starts
  if (previousCycles.length >= 1) {
    const lastStart = previousCycles[previousCycles.length - 1].startDate;
    const interval = getHaflagah(lastStart, startDate);
    vesetDates.push({
      date: addDays(startDate, interval),
      type: 'veset_haflagah',
      onah,
      isFixed: false,
    });
  }

  // Hefsek Taharah — 5th day from start
  const hefsekTaharahDate = addDays(startDate, 4);

  // Mikveh night — 7 clean days after hefsek = day 12 from start
  const mikvehNight = addDays(startDate, 11);

  // Proactive alerts
  const alerts: ProactiveAlert[] = [];

  for (const veset of vesetDates) {
    alerts.push({
      type: 'onah_reminder',
      triggerDate: addDays(veset.date, -1),
      message: `Reminder: ${veset.type} expected tomorrow (${veset.onah})`,
    });
  }

  alerts.push({
    type: 'hefsek_taharah',
    triggerDate: hefsekTaharahDate,
    message: 'Today is the day for Hefsek Taharah',
  });

  alerts.push({
    type: 'mikveh_night',
    triggerDate: mikvehNight,
    message: 'Tonight is Mikveh night',
  });

  return {
    vesetDates,
    hefsekTaharahDate,
    mikvehNight,
    alerts,
  };
}
