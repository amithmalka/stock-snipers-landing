import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../config/theme';
import { VesetDate } from '../../types/halachic';

export type DayStatus =
  | 'veset_fixed'
  | 'veset_non_fixed'
  | 'hefsek'
  | 'mikveh'
  | 'cycle_start'
  | 'clean'
  | 'today'
  | null;

interface CalendarDayProps {
  day: number;
  hebrewDay: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: DayStatus;
  vesotOnDay: VesetDate[];
  onPress: () => void;
}

function getDayBackground(status: DayStatus): string {
  switch (status) {
    case 'veset_fixed':
      return colors.calendar.vesetFixed;
    case 'veset_non_fixed':
      return colors.calendar.vesetNonFixed;
    case 'hefsek':
      return colors.calendar.hefsek;
    case 'mikveh':
      return colors.calendar.mikveh;
    case 'cycle_start':
      return colors.primary.rose;
    case 'today':
      return colors.primary.gold;
    default:
      return 'transparent';
  }
}

function getDotColor(type: VesetDate['type']): string {
  switch (type) {
    case 'onah_beinonit':
      return colors.calendar.vesetFixed;
    case 'veset_hachodesh':
      return colors.status.info;
    case 'veset_haflagah':
      return colors.primary.rose;
    case 'or_zarua':
      return '#B47AB4';
    default:
      return colors.neutral.textMuted;
  }
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  hebrewDay,
  isCurrentMonth,
  isToday,
  status,
  vesotOnDay,
  onPress,
}) => {
  const bg = getDayBackground(status);
  const hasStatus = status !== null && status !== 'clean';

  return (
    <TouchableOpacity
      style={[styles.cell, hasStatus && { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isToday && !hasStatus && <View style={styles.todayRing} />}
      <Text
        style={[
          styles.dayNum,
          !isCurrentMonth && styles.otherMonth,
          isToday && !hasStatus && styles.todayText,
          hasStatus && styles.statusText,
        ]}
      >
        {day}
      </Text>
      <Text style={[styles.hebrewDay, !isCurrentMonth && styles.otherMonth]}>
        {hebrewDay}
      </Text>
      {vesotOnDay.length > 0 && (
        <View style={styles.dots}>
          {vesotOnDay.slice(0, 3).map((v, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: getDotColor(v.type) }]}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: 10,
    minHeight: 58,
  },
  todayRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.primary.gold,
  },
  dayNum: {
    fontSize: typography.size.md,
    color: colors.neutral.text,
    fontWeight: '500',
    marginTop: 4,
  },
  hebrewDay: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: 1,
  },
  otherMonth: {
    color: colors.neutral.beigeDeep,
  },
  todayText: {
    color: colors.primary.gold,
    fontWeight: '700',
  },
  statusText: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
