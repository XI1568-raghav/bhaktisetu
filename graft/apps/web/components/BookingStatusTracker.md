# apps\web\components\BookingStatusTracker.tsx

- BookingStatus · type · L13-L19 — type BookingStatus = | 'booked' | 'priest_assigned' | 'in_progress' | 'completed' | 'video_uploaded' | 'delivered';
- StatusStep · interface · L21-L25 — interface StatusStep
- BookingStatusTrackerProps · interface · L36-L39 — interface BookingStatusTrackerProps
- BookingStatusTracker · function · L41-L184 — function BookingStatusTracker({ currentStatus, timestamps = {}, }: BookingStatusTrackerProps)
- formatTimestamp · function · L47-L55 — function formatTimestamp(dateStr: string): string
