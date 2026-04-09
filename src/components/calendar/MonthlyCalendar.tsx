import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CalendarDay, DayStatus } from './CalendarDay';
import { colors, typography, spacing } from '../../config/theme';
import { VesetDate } from '../../types/halachic';
import { toHebrewDate } from '../../utils/hebrewDate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

interface MonthlyCalendarProps {
  year: number;
  month: number; // 0-indexed
  vesetDates: VesetDate[];
  cycleDates: string[];      // ISO dates of cycle starts
  hefsekDate?: string;       // ISO date
  mikvehDate?: string;       // ISO date
  onDayPress: (date: Date, vesot: VesetDate[]) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

interface DayCell {
  date: Date | null;
  day: number;
  hebrewDay: string;
  isCurrentMonth: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun

  const cells: DayCell[] = [];

  // Leading empty cells from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const hd = toHebrewDate(d);
    cells.push({ date: d, day: d.getDate(), hebrewDay: String(hd.day), isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const hd = toHebrewDate(date);
    cells.push({ date, day: d, hebrewDay: String(hd.day), isCurrentMonth: true });
  }

  // Trailing cells to fill last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      const date = new Date(year, month + 1, d);
      const hd = toHebrewDate(date);
      cells.push({ date, day: d, hebrewDay: String(hd.day), isCurrentMonth: false });
    }
  }

  return cells;
}

function isoOf(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  year,
  month,
  vesetDates,
  cycleDates,
  hefsekDate,
  mikvehDate,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}) => {
  const today = isoOf(new Date());

  const vesetMap = useMemo(() => {
    const map: Record<string, VesetDate[]> = {};
    for (const v of vesetDates) {
      if (!map[v.date]) map[v.date] = [];
      map[v.date].push(v);
    }
    return map;
  }, [vesetDates]);

  const cycleSet = useMemo(() => new Set(cycleDates), [cycleDates]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthName = new Date(year, month, 1).toLocaleString('he-IL', {
    month: 'long',
    year: 'numeric',
  });

  function getStatus(cell: DayCell): DayStatus {
    if (!cell.date || !cell.isCurrentMonth) return null;
    const iso = isoOf(cell.date);
    if (iso === today) return 'today';
    if (cycleSet.has(iso)) return 'cycle_start';
    if (iso === mikvehDate) return 'mikveh';
    if (iso === hefsekDate) return 'hefsek';
    const vesot = vesetMap[iso];
    if (vesot) return vesot.some((v) => v.isFixed) ? 'veset_fixed' : 'veset_non_fixed';
    return 'clean';
  }

  const rows = [];
  for (let i = 0; i < grid.length; i += 7) {
    rows.push(grid.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={onNextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((l) => (
          <Text key={l} style={styles.weekLabel}>{l}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => (
            <CalendarDay
              key={ci}
              day={cell.day}
              hebrewDay={cell.hebrewDay}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={cell.date ? isoOf(cell.date) === today : false}
              status={getStatus(cell)}
              vesotOnDay={cell.date ? (vesetMap[isoOf(cell.date)] ?? []) : []}
              onPress={() => {
                if (cell.date) {
                  onDayPress(cell.date, vesetMap[isoOf(cell.date)] ?? []);
                }
              }}
            />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: colors.calendar.vesetFixed, label: 'וסת קבוע' },
          { color: colors.calendar.vesetNonFixed, label: 'וסת שאינו קבוע' },
          { color: colors.calendar.hefsek, label: 'הפסק טהרה' },
          { color: colors.calendar.mikveh, label: 'ליל טבילה' },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.cream,
    borderRadius: 16,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    padding: spacing.sm,
  },
  navArrow: {
    fontSize: 28,
    color: colors.primary.gold,
    fontWeight: '300',
  },
  monthTitle: {
    fontSize: typography.size.lg,
    fontWeight: '600',
    color: colors.neutral.text,
    letterSpacing: 0.3,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.size.xs,
    color: colors.neutral.textLight,
  },
});
