import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: TabIconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <RoleGuard allowedRoles={['devotee']}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.saffron[600],
        tabBarInactiveTintColor: colors.stone[400],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pujas"
        options={{
          title: 'Pujas',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="flame" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="darshan"
        options={{
          title: 'Darshan',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="videocam" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="bag-handle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
          title: 'Messages',
        }}
      />
      {/* Secondary screens — accessible via navigation, hidden from tab bar */}
      <Tabs.Screen
        name="temples"
        options={{
          href: null,
          title: 'Temples',
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          href: null,
          title: 'Content',
        }}
      />
      <Tabs.Screen
        name="astrology"
        options={{
          href: null,
          title: 'Astrology',
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          href: null,
          title: 'Wellness',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          href: null,
          title: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="donations"
        options={{
          href: null,
          title: 'Donations',
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
          title: 'Support',
        }}
      />
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
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
});
