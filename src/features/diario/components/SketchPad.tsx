import React, { useRef, useState, useCallback } from 'react';
import { Alert, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Button } from '@/ui';
import { hapticService } from '@/services/hapticService';

export interface SketchStrokes {
  d: string[];
  colors: string[];
  widths: number[];
}

const PEN_COLORS = ['#2B2B2B', '#C67B5C', '#3E6B60', '#E0A458', '#C0504D', '#7A6FB0', '#FFFFFF'];
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

  // Refs para evitar stale closures en PanResponder
  const pathsRef = useRef<string[]>([...paths]);
  const colorsRef = useRef<string[]>([...colors]);
  const widthsRef = useRef<number[]>([...widths]);
  const currentPath = useRef('');
  const penColorRef = useRef(penColor);
  const penWidthRef = useRef(penWidth);

  // Sincronizar refs
  penColorRef.current = penColor;
  penWidthRef.current = penWidth;

  const syncState = useCallback(() => {
    setPaths([...pathsRef.current]);
    setColors([...colorsRef.current]);
    setWidths([...widthsRef.current]);
  }, []);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        pathsRef.current = [...pathsRef.current, currentPath.current];
        colorsRef.current = [...colorsRef.current, penColorRef.current];
        widthsRef.current = [...widthsRef.current, penWidthRef.current];
        syncState();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        const idx = pathsRef.current.length - 1;
        if (idx >= 0) {
          pathsRef.current[idx] = currentPath.current;
          syncState();
        }
      },
      onPanResponderRelease: () => {
        hapticService.light();
      },
    }),
  ).current;

  const undo = () => {
    pathsRef.current = pathsRef.current.slice(0, -1);
    colorsRef.current = colorsRef.current.slice(0, -1);
    widthsRef.current = widthsRef.current.slice(0, -1);
    syncState();
  };

  const clear = () => {
    pathsRef.current = [];
    colorsRef.current = [];
    widthsRef.current = [];
    syncState();
  };

  const validPaths = paths.filter((p) => p.length > 0);

  return (
    <View>
      {/* Colores */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, marginBottom: 6 }}>COLOR</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {PEN_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setPenColor(c)}
            style={{
              width: 30, height: 30, borderRadius: 15, backgroundColor: c,
              borderWidth: penColor === c ? 3 : 2,
              borderColor: penColor === c ? theme.primary : theme.border,
            }}
            accessibilityLabel={`Color ${c}`}
          />
        ))}
      </View>

      {/* Grosor */}
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, marginBottom: 6 }}>GROSOR</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {PEN_WIDTHS.map((w) => (
          <Pressable
            key={w}
            onPress={() => setPenWidth(w)}
            style={{
              width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
              backgroundColor: penWidth === w ? theme.primarySoft : 'transparent',
              borderWidth: penWidth === w ? 2 : 1,
              borderColor: penWidth === w ? theme.primary : theme.border,
            }}
          >
            <View style={{ width: w + 2, height: w + 2, borderRadius: (w + 2) / 2, backgroundColor: theme.text }} />
          </Pressable>
        ))}
      </View>

      {/* Lienzo */}
      <View
        {...responder.panHandlers}
        style={{ height, borderRadius: radius.lg, borderWidth: 2, borderColor: theme.border, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
      >
        <Svg width="100%" height="100%">
          {paths.map((d, i) => (
            <Path
              key={`${i}-${colors[i]}`}
              d={d}
              stroke={colors[i] ?? '#2B2B2B'}
              strokeWidth={widths[i] ?? 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>

      {/* Contador */}
      <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 6, textAlign: 'center' }}>
        {`${validPaths.length} trazo${validPaths.length !== 1 ? 's' : ''} · Dibuja con el dedo sobre el lienzo`}
      </Text>

      {/* Acciones */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button label="↩️ Deshacer" variant="ghost" onPress={undo} style={{ flex: 1, height: 44 }} />
        <Button label="🗑️ Limpiar" variant="ghost" onPress={clear} style={{ flex: 1, height: 44 }} />
        <Button label="✕ Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1, height: 44 }} />
      </View>
      <Button label="💾 Guardar sketch" onPress={() => onSave({ d: paths, colors, widths })} style={{ marginTop: 10 }} />
    </View>
  );
}
