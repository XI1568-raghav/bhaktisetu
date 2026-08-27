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
      {/*
        expo-router builds the tab list from the FILE SYSTEM — a <Tabs.Screen>
        only attaches options to a route the directory already created. So a
        route file with no declaration is not hidden, it is an extra tab
        labelled with its raw file name. Both of these were exactly that:
        `puja-book` (PAR-15's booking screen, pushed from the Pujas card) and
        `consultations` (reached from Profile) each sat on the devotee tab bar
        as an unlabelled sixth and seventh entry. Guarded by
        lib/__tests__/tab-route-registration.par15.test.ts.
      */}
      <Tabs.Screen name="puja-book" options={{ href: null, title: 'Book a Puja' }} />
      <Tabs.Screen name="consultations" options={{ href: null, title: 'Consultations' }} />
      {/* PAR-22 (B): real search over /temples/search + /content/search,
          pushed from the home header. Hidden from the bar for the same
          filesystem-routing reason as the two above. */}
      <Tabs.Screen name="search" options={{ href: null, title: 'Search' }} />
      {/* PAR-22 (C): the in-app browser. Pushed by lib/in-app-web.ts when the
          optional react-native-webview module resolves; today the require
          throws in every build from this tree and the screen renders its
          browser hand-off, so declaring it changes nothing on the bar and
          everything the moment the module is installed. Same href:null reason
          as the three above. */}
      <Tabs.Screen name="web-view" options={{ href: null, title: 'Darshya' }} />
      {/* TD10 — feature-parity sub-screens. Hidden from tab bar; reached via push. */}
      <Tabs.Screen name="darshan-player" options={{ href: null, title: 'Darshan Player' }} />
      <Tabs.Screen name="kundli" options={{ href: null, title: 'Kundli' }} />
      <Tabs.Screen name="horoscope" options={{ href: null, title: 'Horoscope' }} />
      <Tabs.Screen name="yatra" options={{ href: null, title: 'Yatra' }} />
      <Tabs.Screen name="yatra-detail" options={{ href: null, title: 'Yatra Detail' }} />
      <Tabs.Screen name="weddings" options={{ href: null, title: 'Weddings' }} />
      <Tabs.Screen name="weddings-muhurat" options={{ href: null, title: 'Muhurat' }} />
      <Tabs.Screen name="upgrade" options={{ href: null, title: 'Upgrade' }} />
      {/* Knowledge + Gurukul journeys — hidden, reached via push */}
      <Tabs.Screen name="knowledge" options={{ href: null, title: 'Knowledge' }} />
      <Tabs.Screen name="knowledge-category" options={{ href: null, title: 'Knowledge Category' }} />
      <Tabs.Screen name="knowledge-article" options={{ href: null, title: 'Article' }} />
      <Tabs.Screen name="learn-sanskrit" options={{ href: null, title: 'Learn Sanskrit' }} />
      <Tabs.Screen name="lesson" options={{ href: null, title: 'Lesson' }} />
      <Tabs.Screen name="gurukuls" options={{ href: null, title: 'Gurukuls' }} />
      <Tabs.Screen name="gurukul-detail" options={{ href: null, title: 'Gurukul' }} />
      <Tabs.Screen name="gurukul-apply" options={{ href: null, title: 'Apply' }} />
      <Tabs.Screen name="gurukul-portal" options={{ href: null, title: 'Gurukul Portal' }} />
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
