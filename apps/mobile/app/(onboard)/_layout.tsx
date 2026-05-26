import { Stack } from 'expo-router';

export default function OnboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFAF9' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="list-temple" />
      <Stack.Screen name="become-priest" />
      <Stack.Screen name="become-astrologer" />
      <Stack.Screen name="become-wellness" />
      <Stack.Screen name="list-gaushala" />
      <Stack.Screen name="become-gurukul" />
      <Stack.Screen name="waitlist" />
    </Stack>
  );
}
