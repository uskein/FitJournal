import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { pathsBBox } from '@/utils/sketches';
import type { SketchStrokes } from './SketchPad';

interface SketchSvgProps {
  strokes: SketchStrokes;
  style?: StyleProp<ViewStyle>;
  /** viewBox si los trazos están vacíos */
  fallbackViewBox?: string;
}

/**
 * SketchSvg — HU-15
 * Renderiza un sketch con viewBox derivado del bounding box real de los trazos
 * (papel blanco), para que el dibujo se vea completo en cualquier dispositivo.
 */
export function SketchSvg({ strokes, style, fallbackViewBox = '0 0 400 350' }: SketchSvgProps) {
  const paths = strokes.d ?? [];
  const viewBox = useMemo(() => pathsBBox(paths) ?? fallbackViewBox, [paths, fallbackViewBox]);

  return (
    <View style={[{ backgroundColor: '#FFFFFF', overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox={viewBox}>
        {paths.filter((d) => d && d.length > 0).map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={(strokes.colors ?? [])[i] ?? '#2B2B2B'}
            strokeWidth={(strokes.widths ?? [])[i] ?? 2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}
