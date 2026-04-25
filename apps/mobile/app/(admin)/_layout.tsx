import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function AdminLayout() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
