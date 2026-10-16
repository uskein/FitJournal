import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface BodyMapProps {
  activeZones: string[];
  height?: number;
}

const ZONE_LABELS: Record<string, { label: string; icon: string; row: number }> = {
  hombro: { label: 'Hombros', icon: '💪', row: 0 },
  pecho: { label: 'Pecho', icon: '🫁', row: 1 },
  cardio: { label: 'Cardio', icon: '❤️', row: 1 },
  espalda: { label: 'Espalda', icon: '🔙', row: 1 },
  brazo: { label: 'Brazos', icon: '💪', row: 2 },
  core: { label: 'Core', icon: '🎯', row: 3 },
  glúteo: { label: 'Glúteos', icon: '🍑', row: 4 },
  pierna: { label: 'Piernas', icon: '🦵', row: 5 },
};

export function BodyMap({ activeZones, height = 220 }: BodyMapProps) {
  const theme = useTheme();
  const active = new Set(activeZones.map(z => z.toLowerCase()));

  const rows = Array.from({ length: 6 }, (_, row) =>
    Object.entries(ZONE_LABELS).filter(([, v]) => v.row === row),
  );

  return (
    <View style={{ alignItems: 'center', minHeight: height, justifyContent: 'center' }}>
      {/* Silueta simplificada con bloques */}
      <View style={{ alignItems: 'center', gap: 4 }}>
        {/* Cabeza */}
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.field, borderWidth: 1, borderColor: theme.border }} />
        {/* Hombros */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {['hombro'].map(z => (
            <View key={z} style={{ width: 48, height: 14, borderRadius: 7, backgroundColor: active.has(z) ? theme.primary : theme.field, opacity: active.has(z) ? 0.7 : 1 }} />
          ))}
        </View>
        {/* Torso: pecho */}
        <View style={{ width: 64, height: 20, borderRadius: 8, backgroundColor: active.has('pecho') ? theme.primary : theme.field, opacity: active.has('pecho') ? 0.7 : 1 }} />
        {/* Core */}
        <View style={{ width: 52, height: 18, borderRadius: 8, backgroundColor: active.has('core') ? theme.primary : theme.field, opacity: active.has('core') ? 0.7 : 1 }} />
        {/* Glúteos */}
        <View style={{ width: 56, height: 16, borderRadius: 8, backgroundColor: active.has('glúteo') ? theme.secondary : theme.field, opacity: active.has('glúteo') ? 0.7 : 1 }} />
        {/* Piernas */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1].map(i => (
            <View key={i} style={{ width: 20, height: 36, borderRadius: 8, backgroundColor: active.has('pierna') ? theme.secondary : theme.field, opacity: active.has('pierna') ? 0.7 : 1 }} />
          ))}
        </View>
      </View>

      {/* Leyenda */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        {[...active].map(zone => {
          const info = ZONE_LABELS[zone];
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
