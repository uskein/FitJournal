import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import type { MonthMarkers } from '../hooks/useMonthEntries';

/**
 * CalendarMonth — BLUEPRINTS §2
 * Calendario mensual con aspecto de calendario real: encabezado L-M-X-J-V-S-D
 * alineado a 7 columnas fijas, una fila por semana (sin porcentajes que se
 * desborden), círculo sólido en hoy, tinte de mood en días con entrada y
 * puntitos de ánimo/gimnasio siempre en la misma posición.
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
  // Completar la última semana para que toda fila tenga exactamente 7 celdas
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      {/* Encabezado de días de la semana (misma retícula de 7 columnas) */}
      <View style={[styles.dowRow, { borderBottomColor: theme.border }]}>
        {DOW.map((d) => (
          <View key={d} style={styles.dowCell}>
            <Text style={[styles.dow, { color: theme.textMuted }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Rejilla: una fila por semana */}
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={`w${wi}`} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) return <View key={`x${wi}-${di}`} style={styles.cell} />;
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const m = markers[iso];
              const isToday = iso === todayISO;
              const hasEntry = !!m?.hasEntry;
              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityLabel={`${day}${hasEntry ? ', con entrada' : ''}${m?.hasWorkout ? ', entrenó' : ''}`}
                  onPress={() => onPressDay(iso)}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.day,
                    {
                      backgroundColor: m?.color ? `${m.color}2E` : theme.field,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={[styles.numBox, isToday && { backgroundColor: theme.primary }]}>
                    <Text
                      style={[
                        styles.dayNum,
                        { color: hasEntry ? theme.text : theme.textMuted },
                        isToday && { color: '#FFFFFF', fontFamily: fonts.bodyBold },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {/* Puntitos siempre presentes: la cifra no salta de lugar */}
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
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dowRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dowCell: { flex: 1, alignItems: 'center' },
  dow: { fontSize: 10, fontFamily: fonts.bodyBold, letterSpacing: 1.5 },
  grid: { marginTop: 2 },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    marginVertical: 1,
  },
  day: {
    borderRadius: radius.md,
  },
  numBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontFamily: fonts.dataMedium, fontSize: 13 },
  dots: { height: 6, flexDirection: 'row', gap: 3, marginTop: 1, alignItems: 'center' },
});
