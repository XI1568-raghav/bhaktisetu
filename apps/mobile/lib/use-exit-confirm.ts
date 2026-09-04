import { useCallback, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Double-tap-to-exit for Android hardware back.
 *
 * app/index.tsx enters every role via `router.replace(...)`, so a role
 * dashboard is the only entry on its stack and one back press drops the user
 * straight out of the app with no confirmation. Call this on the screen that
 * sits at the root of a role stack and the first press shows a toast instead;
 * a second press inside the window falls through to the OS and exits.
 *
 * No-op on iOS — BackHandler has no iOS meaning and iOS has no hardware back.
 *
 * Modelled on the BackHandler in app/(devotee)/web-view.tsx: useFocusEffect +
 * useCallback so the listener is attached only while the screen is focused, and
 * `sub.remove()` on blur so a backgrounded dashboard cannot swallow a press
 * meant for whatever is on top of it.
 */

const EXIT_WINDOW_MS = 2000;

export function useExitConfirm(message = 'Press back again to exit'): void {
  const lastPressAt = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      // Every focus starts a fresh window. Without this a stale timestamp from
      // an earlier visit could let a single press exit immediately.
      lastPressAt.current = 0;

      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const now = Date.now();
        if (lastPressAt.current > 0 && now - lastPressAt.current < EXIT_WINDOW_MS) {
          // Second press inside the window: let the OS handle it and exit.
          return false;
        }
        lastPressAt.current = now;
        ToastAndroid.show(message, ToastAndroid.SHORT);
        return true;
      });

      return () => sub.remove();
    }, [message]),
  );
}
