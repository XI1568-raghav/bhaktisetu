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

export default function WellnessLayout() {
  const tabBarStyle = useTabBarStyle();
  return (
    <RoleGuard allowedRoles={['wellness_instructor']}>
      {/* Android hardware back returns to Home. `initialRouteName` is load-bearing:
          expo-router orders tab routes by NAME LENGTH, so the default `firstRoute`
          would land on whichever route has the shortest file name. */}
      <Tabs
        backBehavior="initialRoute"
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green[600],
          tabBarInactiveTintColor: colors.stone[400],
          tabBarStyle: [styles.tabBar, tabBarStyle],
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <TabIcon name="grid" color={color} size={size} /> }} />
        <Tabs.Screen name="sessions" options={{ title: 'Sessions', tabBarIcon: ({ color, size }) => <TabIcon name="leaf" color={color} size={size} /> }} />
        <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: ({ color, size }) => <TabIcon name="people" color={color} size={size} /> }} />
        {/* PAR-22: the instructor dashboard deliberately shows no money (PAR-10
            deleted an invented earnings figure from it), so this was the only
            place in the app an instructor could learn what they had earned —
            and it did not exist. */}
        <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <TabIcon name="cash" color={color} size={size} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <TabIcon name="person" color={color} size={size} /> }} />
        <Tabs.Screen name="subscription" options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <TabIcon name="card" color={color} size={size} /> }} />
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
