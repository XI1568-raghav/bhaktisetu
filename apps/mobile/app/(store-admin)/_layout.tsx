import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function StoreAdminLayout() {
  return (
    <RoleGuard allowedRoles={['store_owner']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.saffron[600],
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }} />
        <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: ({ color, size }) => <TabIcon name="cube" color={color} size={size} /> }} />
        <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <TabIcon name="bag-handle" color={color} size={size} /> }} />
        <Tabs.Screen name="revenue" options={{ title: 'Revenue', tabBarIcon: ({ color, size }) => <TabIcon name="trending-up" color={color} size={size} /> }} />
        <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: ({ color, size }) => <TabIcon name="star" color={color} size={size} /> }} />
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
