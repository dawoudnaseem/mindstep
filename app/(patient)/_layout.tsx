import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, icon: IoniconName, iconOutline: IoniconName) {
  return (
    <Ionicons
      name={focused ? icon : iconOutline}
      size={24}
      color={focused ? colors.primary : colors.textSecondary}
    />
  );
}

export default function PatientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 10,
          paddingBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'checkmark-circle', 'checkmark-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) =>
            tabIcon(focused, 'bar-chart', 'bar-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'person', 'person-outline'),
        }}
      />
      {/* Navigated to via router.push, not shown as tabs */}
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
    </Tabs>
  );
}
