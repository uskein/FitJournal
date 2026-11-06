import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Photo } from '@/core/types';

interface PhotoViewerModalProps {
  photos: Photo[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

/**
 * PhotoViewerModal — visor de fotos a pantalla completa (HU-09 · galería)
 * Fondo oscuro + pager deslizante con indicador "2/5" y cierre con ✕.
 */
export function PhotoViewerModal({ photos, visible, initialIndex = 0, onClose }: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);

  // Al abrir: reinicia el índice y desplaza al inicio elegido
  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [visible, initialIndex, width]);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i >= 0 && i < photos.length) setIndex(i);
          }}
          style={{ flex: 1 }}
        >
          {photos.map((p) => (
            <View key={p.id} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: p.filePath }} style={{ width, height: height * 0.82 }} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        {/* Indicador de página */}
        <View
          style={{
            position: 'absolute', top: insets.top + 16, left: 16,
            backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999,
            paddingHorizontal: 12, paddingVertical: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'JetBrainsMono_700Bold' }}>
            {`${index + 1}/${photos.length}`}
          </Text>
        </View>

        {/* Cerrar */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar visor de fotos"
          style={{
            position: 'absolute', top: insets.top + 16, right: 16,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>✕</Text>
        </Pressable>

        <Text
          style={{
            position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16,
            textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13,
          }}
        >
          Desliza para ver las fotos · toca ✕ para cerrar
        </Text>
      </View>
    </Modal>
  );
}
