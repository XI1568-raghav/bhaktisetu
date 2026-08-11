# apps\web\app\admin\users\page.tsx

- UserStatus · type · L28-L28 — type UserStatus = 'active' | 'pending' | 'blocked';
- AdminUserRow · interface · L30-L38 — interface AdminUserRow
- mapStatus · function · L73-L78 — function mapStatus(raw: BackendUser): UserStatus
- mapUser · function · L80-L92 — function mapUser(raw: BackendUser): AdminUserRow
- AdminUsersPage · function · L94-L100 — function AdminUsersPage()
- AdminUsersPageContent · function · L102-L433 — function AdminUsersPageContent()
- handleApprove · function · L149-L160 — handleApprove = async (userId: string)
- handleToggleBlock · function · L162-L180 — handleToggleBlock = async (userId: string, currentStatus: UserStatus)
- handleRoleChange · function · L182-L193 — handleRoleChange = async (userId: string, nextUiRole: UiRole)
- handleDelete · function · L195-L209 — handleDelete = async (userId: string)
