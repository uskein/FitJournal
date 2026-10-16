import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius } from '@/theme/tokens';

/**
 * Bottom Tab Bar — componente del Design System (manual-identidad-visual.md §4.13)
 * 4 tabs: Hoy · Diario · Entrenar · Progreso
 * Activo: icono primary + chip pill primarySoft. Inactivo: muted.
 * Badge ámbar: sesión pendiente (Sprint 6).
 */

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: focused ? palette.primarySoft : 'transparent',
      }}
    >
      {icon}
    </Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.elevated,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 11 },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="hoy"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diario',
          tabBarIcon: ({ focused }) => <TabIcon icon="📓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="entrenar"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏋️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ focused }) => <TabIcon icon="📈" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
