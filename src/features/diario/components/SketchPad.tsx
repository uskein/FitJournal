import React, { useRef, useState } from 'react';
import { PanResponder, View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Button } from '@/ui';

/**
 * SketchPad — HU-15 · PLAN_DE_SPRINTS §5.4
 * Lienzo a mano alzada (PanResponder + SVG). Los trazos se serializan a
 * JSON vectorial [{d}] para guardarse en sketches.strokes.
 */

export interface SketchStrokes {
  d: string[];
}

interface SketchPadProps {
  initial?: SketchStrokes | null;
  onSave: (strokes: SketchStrokes) => void;
  onCancel: () => void;
  height?: number;
}

export function SketchPad({ initial, onSave, onCancel, height = 320 }: SketchPadProps) {
  const theme = useTheme();
  const [paths, setPaths] = useState<string[]>(initial?.d ?? []);
  const currentPath = useRef('');

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPaths((prev) => {
          const last = prev[prev.length - 1];
          if (last === undefined) return [currentPath.current];
          return [...prev.slice(0, -1), currentPath.current];
        });
      },
      onPanResponderRelease: () => {
        setPaths((prev) => [...prev, '']);
        currentPath.current = '';
      },
    }),
  ).current;

  return (
    <View>
      <View
        {...responder.panHandlers}
        style={[styles.canvas, { backgroundColor: theme.elevated, borderColor: theme.border, height }]}
      >
        <Svg width="100%" height="100%">
          {paths
            .filter((p) => p.length > 0)
            .map((d, i) => (
              <Path key={i} d={d} stroke={theme.text} strokeWidth={3} fill="none" strokeLinecap="round" />
            ))}
        </Svg>
        {paths.filter((p) => p.length > 0).length === 0 && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={[typeHint, { color: theme.textMuted }]}>Dibuja con el dedo ✍️</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Button
          label="Limpiar"
          variant="ghost"
          onPress={() => setPaths([''])}
          style={{ flex: 1, height: 46 }}
        />
        <Button
          label="Descartar"
          variant="ghost"
          onPress={onCancel}
          style={{ flex: 1, height: 46 }}
        />
        <Button
          label="Guardar"
          onPress={() => onSave({ d: paths.filter((p) => p.length > 0) })}
          style={{ flex: 1, height: 46 }}
        />
      </View>
    </View>
  );
}

const typeHint = { fontFamily: fonts.bodyRegular, fontSize: 14 } as const;

const styles = StyleSheet.create({
  canvas: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
