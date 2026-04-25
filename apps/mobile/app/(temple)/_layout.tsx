import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function TempleLayout() {
  return (
    <RoleGuard allowedRoles={['temple_manager']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
