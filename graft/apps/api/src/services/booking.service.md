# apps\api\src\services\booking.service.ts

- CreateBookingInput · interface · L9-L22 — interface CreateBookingInput
- UserBookingsFilters · interface · L24-L30 — interface UserBookingsFilters
- pushMessageFor · function · L51-L80 — function pushMessageFor( status: BookingStatus, pujaName: string, templeName: string, ): { title: string; body: string } | null
- SlotAvailability · interface · L82-L87 — interface SlotAvailability
- BookingService · class · L108-L989 — class BookingService
- generateBookingNumber · method · L112-L123 — private generateBookingNumber(): string
- createBooking · method · L129-L302 — async createBooking(data: CreateBookingInput)
- updateBookingStatus · method · L307-L472 — async updateBookingStatus( bookingId: string, newStatus: BookingStatus, data?: Record<string, any>, )
- cancelBooking · method · L478-L536 — async cancelBooking(bookingId: string, userId: string, reason?: string)
- rescheduleBooking · method · L549-L609 — async rescheduleBooking( bookingId: string, userId: string, newDate: Date, newTimeSlot?: string, )
- getBookingById · method · L615-L680 — async getBookingById(bookingId: string, userId?: string)
- getUserBookings · method · L685-L767 — async getUserBookings(userId: string, filters?: UserBookingsFilters)
- uploadVideoProof · method · L773-L810 — async uploadVideoProof(bookingId: string, priestId: string, videoUrl: string)
- submitReview · method · L816-L882 — async submitReview(bookingId: string, userId: string, rating: number, reviewText?: string)
- checkSlotAvailability · method · L888-L949 — async checkSlotAvailability(templeId: string, pujaTypeId: string, date: string)
- escalateStaleBookings · method · L967-L988 — async escalateStaleBookings(staleHours = 72)
