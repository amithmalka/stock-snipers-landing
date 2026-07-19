import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '../../config/theme';

interface Props {
  week: number;
  sizeCm: number;
  weightGr: number;
  fruit: string;
  trimester: 1 | 2 | 3;
}

export default function BabySizeVisual({ week, sizeCm, weightGr, fruit }: Props) {
  const w = Math.max(1, Math.min(42, week));

  const sizeLabel = sizeCm < 1 ? `${(sizeCm * 10).toFixed(0)} מ"מ` : `${sizeCm.toFixed(1)} ס"מ`;
  const weightLabel = weightGr < 1000 ? `${weightGr} גרם` : `${(weightGr / 1000).toFixed(2)} ק"ג`;

  const ruler: number[] = [];
  for (let i = 0; i <= 50; i += 5) ruler.push(i);

  return (
    <View style={styles.container}>
      {/* Big rose card with the fruit comparison — the visual centerpiece */}
      <View style={styles.comparisonCard}>
        <Text style={styles.compareLabel}>השבוע התינוק בגודל של</Text>
        <Text style={styles.compareFruit}>{fruit}</Text>
        <View style={styles.weekPill}>
          <Text style={styles.weekPillText}>שבוע {w}</Text>
        </View>
      </View>

      {/* Size + weight */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{sizeLabel}</Text>
          <Text style={styles.statLabel}>אורך</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{weightLabel}</Text>
          <Text style={styles.statLabel}>משקל</Text>
        </View>
      </View>

      {/* Centimeter ruler */}
      <View style={styles.rulerWrap}>
        <Svg width="100%" height="32" viewBox="0 0 250 32">
          <Line x1="5" y1="20" x2="245" y2="20" stroke={colors.neutral.beigeDeep} strokeWidth="1.5" />
          <Line
            x1="5"
            y1="20"
            x2={5 + Math.min(240, (sizeCm / 50) * 240)}
            y2="20"
            stroke={colors.primary.rose}
            strokeWidth="3"
          />
          {ruler.map((cm) => {
            const x = 5 + (cm / 50) * 240;
            return (
              <G key={cm}>
                <Line x1={x} y1="15" x2={x} y2="25" stroke={colors.neutral.beigeDeep} strokeWidth="1" />
                <SvgText x={x} y="12" textAnchor="middle" fontSize="8" fill={colors.neutral.textMuted}>
                  {cm}
                </SvgText>
              </G>
            );
          })}
          {sizeCm > 0 && (
            <Circle
              cx={5 + Math.min(240, (sizeCm / 50) * 240)}
              cy={20}
              r="4"
              fill={colors.primary.rose}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          )}
          <SvgText x="248" y="22" fontSize="7" fill={colors.neutral.textMuted}>
            ס&quot;מ
          </SvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  comparisonCard: {
    width: '100%',
    backgroundColor: colors.primary.rosePale,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  compareLabel: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    marginBottom: spacing.xs,
  },
  compareFruit: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary.rose,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  weekPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.rose,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
  },
  weekPillText: {
    fontSize: typography.size.xs,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingHorizontal: spacing.md,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral.beigeDeep,
    marginHorizontal: spacing.sm,
  },
  rulerWrap: {
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
});
