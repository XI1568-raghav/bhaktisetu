import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function PriestLayout() {
  return (
    <RoleGuard allowedRoles={['priest']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.saffron[600],
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="bookings"
          options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <TabIcon name="calendar" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="services"
          options={{ title: 'Services', tabBarIcon: ({ color, size }) => <TabIcon name="flame" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="payouts"
          options={{ title: 'Payouts', tabBarIcon: ({ color, size }) => <TabIcon name="cash" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <TabIcon name="person" color={color} size={size} /> }}
        />
        <Tabs.Screen name="reviews" options={{ href: null, title: 'Reviews' }} />
      </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.stone[200],
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  tabBarLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
