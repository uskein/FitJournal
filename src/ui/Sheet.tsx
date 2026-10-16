import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius, zIndex } from '@/theme/tokens';

/**
 * Sheet — manual-identidad-visual.md §4.12
 * Modal inferior: fondo elevated, radio superior 24, handle border,
 * backdrop #2B2B2B 40%. Acciones apiladas verticalmente (una mano).
 */

interface SheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.elevated, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,43,43,0.4)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: zIndex.sheet,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    marginBottom: 16,
  },
});
