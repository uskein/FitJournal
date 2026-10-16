import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import type { MonthMarkers } from '../hooks/useMonthEntries';

/**
 * CalendarMonth — BLUEPRINTS §2
 * Calendario mensual: día con entrada muestra su mood color (fondo suave +
 * puntito); gym = puntito terracota; hoy = outline primary.
 */

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface CalendarMonthProps {
  year: number;
  month: number; // 0-11
  markers: MonthMarkers;
  todayISO: string;
  onPressDay: (iso: string) => void;
}

export function CalendarMonth({ year, month, markers, todayISO, onPressDay }: CalendarMonthProps) {
  const theme = useTheme();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Lunes = 0
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: Array<number | null> = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <Text key={d} style={[styles.dow, { color: theme.textMuted }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`x${i}`} style={styles.cell} />;
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const m = markers[iso];
          const isToday = iso === todayISO;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              accessibilityLabel={`${day}${m?.hasEntry ? ', con entrada' : ''}${m?.hasWorkout ? ', entrenó' : ''}`}
              onPress={() => onPressDay(iso)}
              style={[
                styles.cell,
                styles.day,
                shadows.clay,
                {
                  backgroundColor: m?.color ? `${m.color}2E` : theme.elevated,
                  borderColor: isToday ? theme.primary : 'transparent',
                  borderWidth: isToday ? 2 : 0,
                },
              ]}
            >
              <Text style={[styles.dayNum, { color: m?.hasEntry ? theme.text : theme.textMuted }]}>
                {day}
              </Text>
              <View style={styles.dots}>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: m?.color ?? 'transparent',
                  }}
                />
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: m?.hasWorkout ? theme.secondary : 'transparent',
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dowRow: { flexDirection: 'row', marginBottom: 8 },
  dow: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 4 },
  day: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontFamily: fonts.dataMedium, fontSize: 13 },
  dots: { flexDirection: 'row', gap: 3, marginTop: 3 },
});
