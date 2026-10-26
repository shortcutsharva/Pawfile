import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlerts } from '@/hooks/useDomain';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { data: alerts } = useAlerts();
  const insets = useSafeAreaInsets();
  const overdue = useMemo(
    () => alerts.filter((alert) => alert.group === 'overdue').length,
    [alerts],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarButton: ({ ref: _ref, ...props }) => <Pressable {...props} android_ripple={undefined} />,
        tabBarActiveTintColor: colors.pine700,
        tabBarInactiveTintColor: colors.ink500,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.ink100,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarBadge: overdue > 0 ? overdue : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brick500, color: colors.white, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? colors.pine700 : colors.ink500} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'Cases',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={24} color={focused ? colors.pine700 : colors.ink500} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? colors.pine700 : colors.ink500} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={focused ? colors.pine700 : colors.ink500} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'}
              size={24}
              color={focused ? colors.pine700 : colors.ink500}
            />
          ),
        }}
      />
    </Tabs>
  );
}

