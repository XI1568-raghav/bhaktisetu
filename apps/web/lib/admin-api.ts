import { API_BASE_URL } from './api-config';

// Backend role enum (Prisma) → UI role string used by admin pages.
export type BackendRole =
  | 'DEVOTEE'
  | 'PANDIT'
  | 'STORE_OWNER'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA_MANAGER'
  | 'TEMPLE_MANAGER'
  | 'ADMIN';

export type UiRole =
  | 'devotee'
  | 'priest'
  | 'store_owner'
  | 'astrologer'
  | 'wellness_instructor'
  | 'gaushala_manager'
  | 'temple_manager'
  | 'admin';

export const backendToUiRole: Record<BackendRole, UiRole> = {
  DEVOTEE: 'devotee',
  PANDIT: 'priest',
  STORE_OWNER: 'store_owner',
  ASTROLOGER: 'astrologer',
  WELLNESS_INSTRUCTOR: 'wellness_instructor',
  GAUSHALA_MANAGER: 'gaushala_manager',
  TEMPLE_MANAGER: 'temple_manager',
  ADMIN: 'admin',
};

export const uiToBackendRole: Record<UiRole, BackendRole> = {
  devotee: 'DEVOTEE',
  priest: 'PANDIT',
  store_owner: 'STORE_OWNER',
  astrologer: 'ASTROLOGER',
  wellness_instructor: 'WELLNESS_INSTRUCTOR',
  gaushala_manager: 'GAUSHALA_MANAGER',
  temple_manager: 'TEMPLE_MANAGER',
  admin: 'ADMIN',
};

export type BackendUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  roles: BackendRole[] | string[];
  status?: string;
  subscriptionTier?: string;
  createdAt: string;
};

export type UsersResponse = {
  users: BackendUser[];
  total: number;
  page: number;
  limit: number;
};

export type RevenueResponse = {
  totalCommissions: number;
  totalSubscriptions: number;
  pendingPayouts: number;
  commissions: Array<{
    id: string;
    bookingId: string;
    providerId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  subscriptionRevenue: Array<{
    plan: string;
    role: string;
    count: number;
    totalAmount: number;
  }>;
};

export type DashboardResponse = {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalRevenue: number;
  pendingApprovals: number;
  activeSubscriptions: number;
  recentTransactions: Array<{
    id: string;
    userId: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
};

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Pulls the API's error message (if present) into the thrown Error so the
// UI surfaces real diagnostics instead of bare HTTP status codes. The API
// returns { error, message } on failures — we append message when available.
async function describeFailure(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    const detail = body.message ?? body.error;
    return detail ? `${fallback} (${res.status}): ${detail}` : `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export async function getUsers(
  token: string | undefined,
  params?: { limit?: number; page?: number; role?: string; search?: string },
): Promise<UsersResponse> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.role) qs.set('role', params.role);
  if (params?.search) qs.set('search', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/admin/users${suffix}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res, 'Failed to load users'));
  }
  return (await res.json()) as UsersResponse;
}

export type PendingApprovalsResponse = {
  approvals: Array<{
    id: string;
    userId: string;
    role: string;
    profileName: string;
    city: string | null;
    createdAt: string;
  }>;
  total: number;
};

export async function getPendingApprovals(
  token: string | undefined,
): Promise<PendingApprovalsResponse> {
  const res = await fetch(`${API_BASE_URL}/admin/pending-approvals`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res, 'Failed to load approvals'));
  }
  return (await res.json()) as PendingApprovalsResponse;
}

export async function patchUser(
  token: string | undefined,
  userId: string,
  updates: { approved?: boolean; blocked?: boolean; roles?: BackendRole[] },
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res, 'Action failed'));
  }
}

export async function getDashboard(token: string | undefined): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res, 'Failed to load dashboard'));
  }
  return (await res.json()) as DashboardResponse;
}

export async function getRevenue(token: string | undefined): Promise<RevenueResponse> {
  const res = await fetch(`${API_BASE_URL}/admin/revenue`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await describeFailure(res, 'Failed to load revenue'));
  }
  return (await res.json()) as RevenueResponse;
}

// ─── CSV helpers ────────────────────────────────────────────────────────────

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) {
    return columns ? columns.join(',') + '\n' : '';
  }
  const cols = columns ?? Object.keys(rows[0]!);
  const header = cols.join(',');
  const body = rows
    .map((row) => cols.map((c) => escapeCsvCell(row[c])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
