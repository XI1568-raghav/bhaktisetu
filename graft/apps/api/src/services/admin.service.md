# apps\api\src\services\admin.service.ts

- UserFilters · interface · L7-L16 — interface UserFilters
- DashboardStats · interface · L18-L32 — interface DashboardStats
- RevenueBreakdown · interface · L34-L55 — interface RevenueBreakdown
- PendingApproval · interface · L57-L64 — interface PendingApproval
- ReportsResponse · interface · L66-L85 — interface ReportsResponse
- AdminService · class · L89-L893 — class AdminService
- getUsers · method · L90-L152 — async getUsers(filters: UserFilters)
- getUserById · method · L154-L189 — async getUserById(id: string)
- updateUser · method · L191-L354 — async updateUser( id: string, updates: { approved?: boolean; blocked?: boolean; roles?: string[] }, )
- getDashboard · method · L356-L433 — async getDashboard(): Promise<DashboardStats>
- getRevenue · method · L435-L514 — async getRevenue(): Promise<RevenueBreakdown>
- getReports · method · L516-L717 — async getReports(): Promise<ReportsResponse>
- getPendingApprovals · method · L719-L801 — async getPendingApprovals(): Promise<PendingApproval[]>
- sendApprovalEmail · method · L810-L858 — private async sendApprovalEmail( userId: string, approved: boolean, roleAssignments: Array<{ role: string }>, ): Promise<void>
- resolvePublicProfileId · method · L860-L892 — private async resolvePublicProfileId(userId: string, role: string): Promise<string | undefined>
