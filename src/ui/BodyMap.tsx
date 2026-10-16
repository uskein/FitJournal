import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

interface BodyMapProps {
  activeZones: string[];
  height?: number;
}

const ZONE_PATHS: Record<string, { d: string; label: string; icon: string }> = {
  pecho: { d: 'M 35 25 L 65 25 L 62 40 L 38 40 Z', label: 'Pecho', icon: '🫁' },
  espalda: { d: 'M 30 25 L 70 25 L 68 55 L 32 55 Z', label: 'Espalda', icon: '🔙' },
  hombro: { d: 'M 20 22 L 35 25 L 32 35 L 18 32 Z M 65 25 L 80 22 L 82 32 L 68 35 Z', label: 'Hombros', icon: '💪' },
  brazo: { d: 'M 15 32 L 22 35 L 20 55 L 12 52 Z M 78 32 L 85 35 L 88 52 L 80 55 Z', label: 'Brazos', icon: '💪' },
  core: { d: 'M 38 42 L 62 42 L 60 60 L 40 60 Z', label: 'Core', icon: '🎯' },
  pierna: { d: 'M 38 62 L 48 62 L 46 95 L 36 95 Z M 52 62 L 62 62 L 64 95 L 54 95 Z', label: 'Piernas', icon: '🦵' },
  glúteo: { d: 'M 38 58 L 62 58 L 60 68 L 40 68 Z', label: 'Glúteos', icon: '🍑' },
};

export function BodyMap({ activeZones, height = 200 }: BodyMapProps) {
  const theme = useTheme();
  const active = new Set(activeZones.map(z => z.toLowerCase()));

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={100} height={height} viewBox="0 0 100 100">
        <Path
          d="M 50 8 C 44 8 40 13 40 19 C 40 23 42 26 44 28 L 30 32 L 18 30 L 15 35 L 22 40 L 25 55 L 22 70 L 18 95 L 28 95 L 33 65 L 40 62 L 40 95 L 48 95 L 50 70 L 52 95 L 60 95 L 60 62 L 67 65 L 72 95 L 82 95 L 78 70 L 75 55 L 78 40 L 85 35 L 82 30 L 70 32 L 56 28 C 58 26 60 23 60 19 C 60 13 56 8 50 8 Z"
          fill={theme.field} stroke={theme.border} strokeWidth={0.5}
        />
        {Object.entries(ZONE_PATHS).map(([key, { d }]) => {
          if (!active.has(key)) return null;
          const color = key === 'pierna' || key === 'glúteo' ? theme.secondary : theme.primary;
          return <Path key={key} d={d} fill={color} fillOpacity={0.55} />;
        })}
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        {[...active].map(zone => {
          const info = ZONE_PATHS[zone];
          if (!info) return null;
          return (
            <View key={zone} style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{info.icon} {info.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
