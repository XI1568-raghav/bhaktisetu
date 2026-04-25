import { Stack } from 'expo-router';
import { RoleGuard } from '../../lib/role-guard';

export default function StoreAdminLayout() {
  return (
    <RoleGuard allowedRoles={['store_owner']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="dashboard" />
      </Stack>
    </RoleGuard>
  );
}
