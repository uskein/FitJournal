import React, { useRef, useState } from 'react';
import { PanResponder, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button } from '@/ui';

export interface SketchStrokes {
  d: string[];
  colors: string[];
  widths: number[];
}

const PEN_COLORS = ['#2B2B2B', '#C67B5C', '#3E6B60', '#E0A458', '#C0504D', '#7A6FB0'];
const PEN_WIDTHS = [2, 4, 8, 14];

interface SketchPadProps {
  initial?: SketchStrokes | null;
  onSave: (strokes: SketchStrokes) => void;
  onCancel: () => void;
  height?: number;
}

export function SketchPad({ initial, onSave, onCancel, height = 300 }: SketchPadProps) {
  const theme = useTheme();
  const [paths, setPaths] = useState<string[]>(initial?.d ?? []);
  const [colors, setColors] = useState<string[]>(initial?.colors ?? []);
  const [widths, setWidths] = useState<number[]>(initial?.widths ?? []);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]!);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]!);
  const [activeIdx, setActiveIdx] = useState(-1);
  const currentPath = useRef('');

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPaths((prev) => [...prev, currentPath.current]);
        setColors((prev) => [...prev, penColor]);
        setWidths((prev) => [...prev, penWidth]);
        setActiveIdx(paths.length);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPaths((prev) => {
          const next = [...prev];
          next[activeIdx] = currentPath.current;
          return next;
        });
      },
    }),
  ).current;

  return (
    <View>
      {/* Controles de color */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {PEN_COLORS.map((c) => (
          <View
            key={c}
            style={{
              width: 28, height: 28, borderRadius: 14, backgroundColor: c,
              borderWidth: penColor === c ? 3 : 1,
              borderColor: penColor === c ? theme.primary : theme.border,
            }}
            onTouchEnd={() => setPenColor(c)}
          />
        ))}
      </View>

      {/* Controles de grosor */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted }}>GROSOR:</Text>
        {PEN_WIDTHS.map((w) => (
          <View
            key={w}
            style={{
              width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: penWidth === w ? theme.primarySoft : 'transparent',
              borderWidth: penWidth === w ? 2 : 1,
              borderColor: penWidth === w ? theme.primary : theme.border,
            }}
            onTouchEnd={() => setPenWidth(w)}
          >
            <View style={{ width: w + 2, height: w + 2, borderRadius: (w + 2) / 2, backgroundColor: theme.text }} />
          </View>
        ))}
      </View>

      {/* Lienzo */}
      <View
        {...responder.panHandlers}
        style={{ height, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff', overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%">
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={colors[i] ?? theme.text}
              strokeWidth={widths[i] ?? 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>

      {/* Acciones */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button label="🗑️ Limpiar" variant="ghost" onPress={() => { setPaths([]); setColors([]); setWidths([]); setActiveIdx(-1); }} style={{ flex: 1, height: 44 }} />
        <Button label="↩️ Deshacer" variant="ghost" onPress={() => { setPaths((p) => p.slice(0, -1)); setColors((c) => c.slice(0, -1)); setWidths((w) => w.slice(0, -1)); setActiveIdx((i) => i - 1); }} style={{ flex: 1, height: 44 }} />
        <Button label="✕ Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1, height: 44 }} />
      </View>
      <Button
        label="💾 Guardar sketch"
        onPress={() => onSave({ d: paths.filter((p) => p.length > 0), colors: colors.slice(0, paths.filter((p) => p.length > 0).length), widths: widths.slice(0, paths.filter((p) => p.length > 0).length) })}
        style={{ marginTop: 10 }}
      />
    </View>
  );
}
