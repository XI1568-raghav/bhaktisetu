# apps\web\app\store-admin\page.tsx

- StoreOrderStatus · type · L24-L31 — type StoreOrderStatus = | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
- StoreOrderApi · interface · L33-L42 — interface StoreOrderApi
- DashboardData · interface · L44-L62 — interface DashboardData
- formatCurrency · function · L76-L82 — function formatCurrency(amount: number): string
- getOrderStatusBadge · function · L84-L96 — function getOrderStatusBadge(status: string)
- thisMonthStart · function · L98-L101 — function thisMonthStart(): Date
- aggregateFromOrders · function · L107-L163 — function aggregateFromOrders(orders: StoreOrderApi[]): DashboardData['revenue'] & { orders: DashboardData['orders']; recent: DashboardData['recentOrders']; }
- StoreAdminDashboard · function · L167-L527 — function StoreAdminDashboard()
- load · function · L179-L302 — async function load()
