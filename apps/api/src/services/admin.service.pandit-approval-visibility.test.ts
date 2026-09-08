/**
 * Approving a pandit made them approved but never made them VISIBLE.
 *
 * Measured on production 2026-09-08, end to end:
 *   1. ct+pandit onboarded via POST /onboarding/provider — Priest row created
 *      with status 'active', isVerified false.
 *   2. The pandit appeared in GET /admin/pending-approvals.
 *   3. An admin clicked Approve. PATCH /admin/users/:id answered
 *      200 {"message":"User updated"} and the row left the queue with
 *      "All caught up!".
 *   4. PanditProfile.approved became true (approvedAt 12:11:43Z).
 *   5. Priest.isVerified stayed FALSE, and GET /priests still returned the same
 *      3 seeded pandits. The approved pandit was not among them.
 *
 * routes/priests-public.ts filters on `{ isVerified: true, status: 'active' }`
 * (lines 146, 228, 260), and NOTHING in the API ever wrote Priest.isVerified —
 * admin.service.updateUser only touched PanditProfile.approved, and
 * POST/PATCH /admin/priests are notImplemented stubs. So the two tables were
 * never bridged: the approval landed in the column the admin queue reads, and
 * the public directory reads a different column on a different table.
 *
 * The business consequence is the whole supply funnel — recruit, onboard,
 * approve — terminating in a pandit no devotee can find or book, while the
 * operator is shown a green success. Only the 3 pandits seeded directly into
 * the DB were ever bookable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({ invalidateAuthUser: vi.fn() }));

import { AdminService } from './admin.service.js';

let service: AdminService;
const USER_ID = '5e6b1783-2782-43ae-ae1b-9b44894af94a';

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
  prismaMock.user.findUnique.mockResolvedValue({ id: USER_ID, fullName: 'CT Pandit', email: 'ct+pandit@darshya.online' });
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: USER_ID, role: 'PANDIT', isPrimary: true }]);
  prismaMock.panditProfile.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.priest.updateMany.mockResolvedValue({ count: 1 });
});

describe('approving a pandit also makes them publicly listable', () => {
  it('sets Priest.isVerified so /priests can return them', async () => {
    await service.updateUser(USER_ID, { approved: true });

    expect(prismaMock.panditProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );

    // The load-bearing assertion: without this the pandit is approved and
    // invisible, which is exactly the production state above.
    expect(prismaMock.priest.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { isVerified: true },
    });
  });

  it('un-verifies on rejection so a revoked pandit leaves the directory', async () => {
    await service.updateUser(USER_ID, { approved: false });

    expect(prismaMock.priest.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { isVerified: false },
    });
  });

  it('does not touch Priest for a non-pandit approval', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: USER_ID, role: 'STORE_OWNER', isPrimary: true },
    ]);
    prismaMock.storeProfile.updateMany.mockResolvedValue({ count: 1 });

    await service.updateUser(USER_ID, { approved: true });

    expect(prismaMock.priest.updateMany).not.toHaveBeenCalled();
  });
});
