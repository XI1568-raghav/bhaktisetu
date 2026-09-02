import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { RoleGuard } from '../../lib/role-guard';
import { useTabBarStyle } from '../../lib/portal-screen';

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
  const tabBarStyle = useTabBarStyle();
  return (
    <RoleGuard allowedRoles={['devotee']}>
    {/* Android hardware back returns Home from any of the 25 href:null secondary
        routes, which are reached by router.push and would otherwise exit the app. */}
    <Tabs
      backBehavior="initialRoute"
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.saffron[600],
        tabBarInactiveTintColor: colors.stone[400],
        tabBarStyle: [styles.tabBar, tabBarStyle],
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

      {/* Store purchase path — cart → checkout → orders. */}
      <Tabs.Screen name="cart" options={{ href: null, title: 'Your Cart' }} />
      <Tabs.Screen name="checkout" options={{ href: null, title: 'Checkout' }} />
      <Tabs.Screen name="orders" options={{ href: null, title: 'My Orders' }} />

      {/* Pandit directory + the puja detail step that now precedes booking. */}
      <Tabs.Screen name="pandits" options={{ href: null, title: 'Pandits' }} />
      <Tabs.Screen name="pandit-detail" options={{ href: null, title: 'Pandit' }} />
      <Tabs.Screen name="puja-detail" options={{ href: null, title: 'Puja' }} />

      {/* Privacy/terms + notification settings (Play Data Safety requirement). */}
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="delete-account" options={{ href: null, title: 'Delete Account' }} />

      {/* PAR-15 — every route file below was added by the mobile-parity work and
          had no <Tabs.Screen>. In expo-router an undeclared route file in a
          (tabs) group does not merely go unlinked: it is auto-registered and
          renders as a STRAY TAB in the bottom bar. Nineteen of them would have
          shipped that way. `href: null` keeps each reachable by router.push
          while keeping it out of the bar, which is the same treatment the
          secondary routes above already use. */}
      <Tabs.Screen name="addresses" options={{ href: null, title: 'Saved Addresses' }} />
      <Tabs.Screen name="astrologers" options={{ href: null, title: 'Astrologers' }} />
      <Tabs.Screen name="astrologer-detail" options={{ href: null, title: 'Astrologer' }} />
      <Tabs.Screen name="astrologer-book" options={{ href: null, title: 'Book a Consultation' }} />
      <Tabs.Screen name="astrology-chat" options={{ href: null, title: 'Consultation' }} />
      <Tabs.Screen name="booking-detail" options={{ href: null, title: 'Booking' }} />
      <Tabs.Screen name="gaushalas" options={{ href: null, title: 'Gaushalas' }} />
      <Tabs.Screen name="gaushala-detail" options={{ href: null, title: 'Gaushala' }} />
      <Tabs.Screen name="horoscope-rashi" options={{ href: null, title: 'Horoscope' }} />
      <Tabs.Screen name="support-ticket" options={{ href: null, title: 'Support Ticket' }} />
      <Tabs.Screen name="temple-detail" options={{ href: null, title: 'Temple' }} />
      <Tabs.Screen name="temple-pujas" options={{ href: null, title: 'Temple Pujas' }} />
      <Tabs.Screen name="weddings-packages" options={{ href: null, title: 'Wedding Packages' }} />
      <Tabs.Screen name="wellness-classes" options={{ href: null, title: 'Classes' }} />
      <Tabs.Screen name="wellness-class" options={{ href: null, title: 'Class' }} />
      <Tabs.Screen name="wellness-instructors" options={{ href: null, title: 'Instructors' }} />
      <Tabs.Screen name="wellness-instructor" options={{ href: null, title: 'Instructor' }} />
      <Tabs.Screen name="wellness-my-classes" options={{ href: null, title: 'My Classes' }} />
      <Tabs.Screen name="yatra-book" options={{ href: null, title: 'Book Yatra' }} />
    </Tabs>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.stone[200],
    borderTopWidth: 1,
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
