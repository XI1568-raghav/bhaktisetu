import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function AstrologerLayout() {
  return (
    <RoleGuard allowedRoles={['astrologer']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
