import { Tabs } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'hoy', label: 'Hoy', icon: '🏠', color: '#3E6B60' },
  { name: 'diario', label: 'Diario', icon: '📓', color: '#7A6FB0' },
  { name: 'entrenar', label: 'Entrenar', icon: '🏋️', color: '#C67B5C' },
  { name: 'semana', label: 'Semana', icon: '🗓️', color: '#4E8C6A' },
  { name: 'progreso', label: 'Progreso', icon: '📈', color: '#E0A458' },
  { name: 'perfil', label: 'Perfil', icon: '👤', color: '#5B8FA8' },
] as const;

function TabIcon({ icon, color, focused }: { icon: string; color: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 40,
        height: 32,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? `${color}22` : 'transparent',
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.elevated,
          borderTopColor: theme.border,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 10 },
      }}
    >
      {TABS.map(t => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ focused }) => <TabIcon icon={t.icon} color={t.color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
