# apps\api\src\services\priest.service.ts

- PriestBookingsFilters · interface · L9-L15 — interface PriestBookingsFilters
- PayoutFilters · interface · L17-L21 — interface PayoutFilters
- UpdatePriestProfileInput · interface · L23-L30 — interface UpdatePriestProfileInput
- PriestService · class · L34-L587 — class PriestService
- getPriestByUserId · method · L40-L48 — private async getPriestByUserId(userId: string)
- getDashboard · method · L53-L153 — async getDashboard(priestId: string)
- getAssignedBookings · method · L158-L221 — async getAssignedBookings(priestId: string, filters?: PriestBookingsFilters)
- acceptBooking · method · L226-L302 — async acceptBooking(bookingId: string, priestId: string)
- rejectBooking · method · L314-L365 — async rejectBooking(bookingId: string, priestId: string)
- startPuja · method · L370-L385 — async startPuja(bookingId: string, priestId: string)
- completePuja · method · L390-L405 — async completePuja(bookingId: string, priestId: string)
- uploadVideoProof · method · L410-L412 — async uploadVideoProof(bookingId: string, priestId: string, videoUrl: string)
- getPayoutHistory · method · L417-L486 — async getPayoutHistory(priestId: string, filters?: PayoutFilters)
- getProfile · method · L491-L551 — async getProfile(priestId: string)
- updateProfile · method · L556-L586 — async updateProfile(priestId: string, data: UpdatePriestProfileInput)
