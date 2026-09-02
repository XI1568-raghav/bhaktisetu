import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';
import { useTabBarStyle } from '../../lib/portal-screen';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function AdminLayout() {
  const tabBarStyle = useTabBarStyle();
  return (
    <RoleGuard allowedRoles={['admin']}>
      {/* Android hardware back returns to Home. `initialRouteName` is load-bearing:
          expo-router orders tab routes by NAME LENGTH, so the default `firstRoute`
          would land on whichever route has the shortest file name. */}
      <Tabs
        backBehavior="initialRoute"
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.stone[900],
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: [styles.tabBar, tabBarStyle],
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }} />
        <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: ({ color, size }) => <TabIcon name="people" color={color} size={size} /> }} />
        <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: ({ color, size }) => <TabIcon name="checkmark-circle" color={color} size={size} /> }} />
        <Tabs.Screen name="revenue" options={{ title: 'Revenue', tabBarIcon: ({ color, size }) => <TabIcon name="trending-up" color={color} size={size} /> }} />
        <Tabs.Screen name="commissions" options={{ title: 'Commissions', tabBarIcon: ({ color, size }) => <TabIcon name="cash" color={color} size={size} /> }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} /> }} />
        <Tabs.Screen name="support" options={{ href: null, title: 'Support' }} />
        <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.stone[200],
    borderTopWidth: 1,
  },
  tabBarLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
