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

export default function StoreAdminLayout() {
  const tabBarStyle = useTabBarStyle();
  return (
    <RoleGuard allowedRoles={['store_owner']}>
      {/* Android hardware back returns to Home. `initialRouteName` is load-bearing:
          expo-router orders tab routes by NAME LENGTH, so the default `firstRoute`
          would land on whichever route has the shortest file name. */}
      <Tabs
        backBehavior="initialRoute"
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.saffron[600],
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: [styles.tabBar, tabBarStyle],
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }} />
        <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: ({ color, size }) => <TabIcon name="cube" color={color} size={size} /> }} />
        <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <TabIcon name="bag-handle" color={color} size={size} /> }} />
        <Tabs.Screen name="revenue" options={{ title: 'Revenue', tabBarIcon: ({ color, size }) => <TabIcon name="trending-up" color={color} size={size} /> }} />
        {/* PAR-22: `revenue` is gross STORE sales, which is neither the owner's
            withdrawable balance nor a way to withdraw it. */}
        <Tabs.Screen name="payouts" options={{ title: 'Payouts', tabBarIcon: ({ color, size }) => <TabIcon name="cash" color={color} size={size} /> }} />
        <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: ({ color, size }) => <TabIcon name="star" color={color} size={size} /> }} />
        <Tabs.Screen name="messages" options={{ href: null, title: 'Messages' }} />
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
