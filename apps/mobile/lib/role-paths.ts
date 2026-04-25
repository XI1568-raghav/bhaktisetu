import type { UserRole } from '@poojly/api-client';

/**
 * Maps a user role to its mobile dashboard route.
 * Mirrors apps/web/lib/auth-context.tsx::getRoleDashboardPath but uses
 * Expo Router group paths (one group per role).
 */
export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'priest':
      return '/(priest)/dashboard';
    case 'store_owner':
      return '/(store-admin)/dashboard';
    case 'astrologer':
      return '/(astrologer)/dashboard';
    case 'wellness_instructor':
      return '/(wellness)/dashboard';
    case 'gaushala_manager':
      return '/(gaushala)/dashboard';
    case 'temple_manager':
      return '/(temple)/dashboard';
    case 'admin':
      return '/(admin)/dashboard';
    case 'devotee':
    default:
      return '/(devotee)';
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'devotee': return 'Devotee';
    case 'priest': return 'Pandit';
    case 'store_owner': return 'Store Owner';
    case 'astrologer': return 'Astrologer';
    case 'wellness_instructor': return 'Wellness Instructor';
    case 'gaushala_manager': return 'Gaushala Manager';
    case 'temple_manager': return 'Temple Manager';
    case 'admin': return 'Admin';
    default: return 'User';
  }
}
