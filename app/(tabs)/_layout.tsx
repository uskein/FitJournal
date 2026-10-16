import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_COLORS = {
  hoy: '#3E6B60',
  diario: '#7A6FB0',
  entrenar: '#C67B5C',
  progreso: '#E0A458',
  perfil: '#5B8FA8',
} as const;

function TabIcon({ name, color, focused }: { name: keyof typeof Ionicons.glyphMap; color: string; focused: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: focused ? `${color}22` : 'transparent',
      }}
    >
      <Ionicons name={name} size={22} color={focused ? color : '#6E6A65'} />
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
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: 'NunitoSans_600SemiBold', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="hoy"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sunny' : 'sunny-outline'} color={TAB_COLORS.hoy} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diario',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'book' : 'book-outline'} color={TAB_COLORS.diario} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="entrenar"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} color={TAB_COLORS.entrenar} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'trending-up' : 'trending-up-outline'} color={TAB_COLORS.progreso} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} color={TAB_COLORS.perfil} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
