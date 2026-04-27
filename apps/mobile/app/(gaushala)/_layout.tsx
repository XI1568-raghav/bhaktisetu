import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function GaushalaLayout() {
  return (
    <RoleGuard allowedRoles={['gaushala_manager']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#92400E',
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }} />
        <Tabs.Screen name="cows" options={{ title: 'Cows', tabBarIcon: ({ color, size }) => <TabIcon name="paw" color={color} size={size} /> }} />
        <Tabs.Screen name="donations" options={{ title: 'Donations', tabBarIcon: ({ color, size }) => <TabIcon name="heart" color={color} size={size} /> }} />
        <Tabs.Screen name="volunteers" options={{ title: 'Team', tabBarIcon: ({ color, size }) => <TabIcon name="people" color={color} size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <TabIcon name="person" color={color} size={size} /> }} />
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
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  tabBarLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
