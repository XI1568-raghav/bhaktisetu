import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function PriestLayout() {
  return (
    <RoleGuard allowedRoles={['priest']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
