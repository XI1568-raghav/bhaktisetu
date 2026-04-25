import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function GaushalaLayout() {
  return (
    <RoleGuard allowedRoles={['gaushala_manager']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
