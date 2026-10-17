import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';

interface LegendAccordionProps {
  title: string;
  children: React.ReactNode;
}

export function LegendAccordion({ title, children }: LegendAccordionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 4 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[typeScale.bodySm, { fontWeight: '700', color: theme.text, flex: 1 }]}>{title}</Text>
        <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '700', marginLeft: 8 }}>{open ? '−' : '＋'}</Text>
      </Pressable>
      {open && (
        <View style={{ paddingBottom: 14 }}>
          <Text style={[typeScale.bodySm, { color: theme.textMuted, lineHeight: 21 }]}>{children}</Text>
        </View>
      )}
    </View>
  );
}
