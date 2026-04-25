import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function WellnessLayout() {
  return (
    <RoleGuard allowedRoles={['wellness_instructor']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
