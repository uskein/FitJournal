import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

interface BodyMapProps {
  activeZones: string[];
  height?: number;
}

const ZONES: Record<string, { label: string; icon: string }> = {
  hombro: { label: 'Hombros', icon: '💪' },
  pecho: { label: 'Pecho', icon: '🫁' },
  espalda: { label: 'Espalda', icon: '🔙' },
  brazo: { label: 'Brazos', icon: '💪' },
  core: { label: 'Core', icon: '🎯' },
  glúteo: { label: 'Glúteos', icon: '🍑' },
  pierna: { label: 'Piernas', icon: '🦵' },
  cardio: { label: 'Cardio', icon: '❤️' },
};

/** Vistas del cuerpo: frente y espalda */
const FRONT_ZONES = ['hombro', 'pecho', 'brazo', 'core', 'glúteo', 'pierna', 'cardio'];
const BACK_ZONES = ['hombro', 'espalda', 'brazo', 'core', 'glúteo', 'pierna'];

export function BodyMap({ activeZones, height = 180 }: BodyMapProps) {
  const theme = useTheme();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const active = new Set(activeZones.map(z => z.toLowerCase()));
  const visibleZones = side === 'front' ? FRONT_ZONES : BACK_ZONES;

  const c = (zone: string, fallback = theme.field) =>
    active.has(zone) && visibleZones.includes(zone) ? theme.primary : fallback;
  const o = (zone: string) =>
    active.has(zone) && visibleZones.includes(zone) ? 0.7 : 1;

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Toggle Frente / Espalda */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {(['front', 'back'] as const).map(s => (
          <Pressable
            key={s}
            onPress={() => setSide(s)}
            style={{
              paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
              backgroundColor: side === s ? theme.primary : 'transparent',
              borderWidth: 1.5, borderColor: side === s ? theme.primary : theme.border,
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: side === s ? '#fff' : theme.textMuted,
            }}>
              {s === 'front' ? '💪 Frente' : '🔙 Espalda'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Svg width={90} height={height} viewBox="0 0 100 110">
        {/* Cabeza */}
        <Path d="M 50 5 C 44 5 39 10 39 16 C 39 21 42 24 45 26 L 55 26 C 58 24 61 21 61 16 C 61 10 56 5 50 5 Z" fill={theme.field} stroke={theme.border} strokeWidth={0.5} />

        {side === 'front' ? (
          <>
            {/* Hombros */}
            <Path d="M 25 28 L 75 28 L 73 34 L 27 34 Z" fill={c('hombro')} opacity={o('hombro')} />
            {/* Brazos */}
            <Path d="M 18 30 L 25 34 L 22 52 L 14 48 Z" fill={c('brazo')} opacity={o('brazo')} />
            <Path d="M 82 30 L 75 34 L 78 48 L 86 52 Z" fill={c('brazo')} opacity={o('brazo')} />
            {/* Pecho */}
            <Path d="M 30 35 L 70 35 L 68 46 L 32 46 Z" fill={c('pecho')} opacity={o('pecho')} />
            {/* Core */}
            <Path d="M 32 47 L 68 47 L 66 58 L 34 58 Z" fill={c('core')} opacity={o('core')} />
            {/* Glúteos */}
            <Path d="M 34 59 L 66 59 L 64 66 L 36 66 Z" fill={c('glúteo', theme.field)} opacity={o('glúteo')} />
            {/* Piernas */}
            <Path d="M 36 67 L 48 67 L 46 100 L 34 100 Z" fill={c('pierna', theme.field)} opacity={o('pierna')} />
            <Path d="M 52 67 L 64 67 L 66 100 L 54 100 Z" fill={c('pierna', theme.field)} opacity={o('pierna')} />
            {/* Corazón (cardio) */}
            {active.has('cardio') && <Path d="M 46 38 L 50 34 L 54 38 L 50 44 Z" fill={theme.error} opacity={0.8} />}
          </>
        ) : (
          <>
            {/* Hombros (traseros) */}
            <Path d="M 25 28 L 75 28 L 73 34 L 27 34 Z" fill={c('hombro')} opacity={o('hombro')} />
            {/* Brazos */}
            <Path d="M 18 30 L 25 34 L 22 52 L 14 48 Z" fill={c('brazo')} opacity={o('brazo')} />
            <Path d="M 82 30 L 75 34 L 78 48 L 86 52 Z" fill={c('brazo')} opacity={o('brazo')} />
            {/* Espalda (zona principal trasera) */}
            <Path d="M 28 35 L 72 35 L 70 55 L 30 55 Z" fill={c('espalda')} opacity={o('espalda')} />
            {/* Core trasero */}
            <Path d="M 32 56 L 68 56 L 66 58 L 34 58 Z" fill={c('core')} opacity={o('core')} />
            {/* Glúteos */}
            <Path d="M 34 59 L 66 59 L 64 66 L 36 66 Z" fill={c('glúteo', theme.field)} opacity={o('glúteo')} />
            {/* Piernas */}
            <Path d="M 36 67 L 48 67 L 46 100 L 34 100 Z" fill={c('pierna', theme.field)} opacity={o('pierna')} />
            <Path d="M 52 67 L 64 67 L 66 100 L 54 100 Z" fill={c('pierna', theme.field)} opacity={o('pierna')} />
          </>
        )}
      </Svg>

      {/* Leyenda — solo zonas visibles y activas */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 }}>
        {visibleZones.filter(z => active.has(z)).map(zone => {
          const info = ZONES[zone];
          if (!info) return null;
          return (
            <View key={zone} style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>{info.icon} {info.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
