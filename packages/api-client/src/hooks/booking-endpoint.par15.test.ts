import { describe, it, expect } from "vitest";
import { API_ENDPOINTS } from "@poojly/shared";
import { toCreateBookingBody } from "./index";

/**
 * PAR-15 — the create-booking hook pointed at a 404.
 *
 * Two endpoint constants were wrong, and both were verified against the running
 * API on 2026-08-12:
 *
 *   POST /api/v1/bookings              -> 404 Route POST:/api/v1/bookings not found
 *   GET  /api/v1/payments/booking/:id  -> 404
 *
 * The real routes are POST /api/v1/bookings/book (bookings.ts registers
 * `server.post('/book')` under prefix '/api/v1/bookings') and
 * GET /api/v1/payments/:id (payments.ts `server.get('/:id')`, whose handler
 * calls `paymentService.getPaymentByBookingId(id)` — the id in the path IS the
 * booking id, which is where the extra `/booking/` segment came from).
 *
 * Correcting the URL alone would have moved `useCreateBooking` from a 404 to a
 * 400: the shared `createBookingSchema` describes a different body from the one
 * POST /bookings/book accepts. It sends `scheduledTime` and
 * `devoteeNames: string[]` with parallel `gotras[]` / `nakshatras[]`; the route
 * requires `scheduledTimeSlot` and `devoteeNames: {name,gotra,nakshatra}[]`.
 * Rewriting the shared schema is not on the table here — it has its own 25-case
 * suite and other consumers — so the hook translates at the boundary instead,
 * which is where a client/server shape difference belongs.
 */

describe("PAR-15 — the endpoints the hooks post to actually exist", () => {
  it("BOOKINGS is the /book route, not the bare collection", () => {
    expect(API_ENDPOINTS.BOOKINGS).toBe("/api/v1/bookings/book");
  });

  it("PAYMENT_BY_BOOKING has no phantom /booking/ segment", () => {
    expect(API_ENDPOINTS.PAYMENT_BY_BOOKING("bk-1")).toBe("/api/v1/payments/bk-1");
  });
});

describe("PAR-15 — the body is translated into what POST /bookings/book accepts", () => {
  const input = {
    templeId: "11111111-1111-1111-1111-111111111111",
    pujaTypeId: "22222222-2222-2222-2222-222222222222",
    templePujaOfferingId: "33333333-3333-3333-3333-333333333333",
    scheduledDate: "2030-01-01",
    scheduledTime: "06:00",
    isOnline: false,
    devoteeNames: ["Ramesh", "Sita"],
    gotras: ["Kashyap"],
    nakshatras: [],
    specialInstructions: "Please chant slowly",
    prasadDeliveryRequested: false,
    currency: "INR" as const,
  };

  it("renames scheduledTime to the scheduledTimeSlot the route requires", () => {
    const body = toCreateBookingBody(input);
    expect(body.scheduledTimeSlot).toBe("06:00");
    expect("scheduledTime" in body).toBe(false);
  });

  it("zips devoteeNames with gotras and nakshatras into per-devotee objects", () => {
    const body = toCreateBookingBody(input);
    expect(body.devoteeNames).toEqual([
      { name: "Ramesh", gotra: "Kashyap", nakshatra: undefined },
      { name: "Sita", gotra: undefined, nakshatra: undefined },
    ]);
  });

  it("drops keys the route does not accept rather than sending them", () => {
    const body = toCreateBookingBody(input) as unknown as Record<string, unknown>;
    expect("isOnline" in body).toBe(false);
    expect("gotras" in body).toBe(false);
    expect("nakshatras" in body).toBe(false);
  });

  it("keeps the identifiers and the address pairing untouched", () => {
    const body = toCreateBookingBody({
      ...input,
      prasadDeliveryRequested: true,
      prasadDeliveryAddressId: "44444444-4444-4444-4444-444444444444",
    });
    expect(body.templeId).toBe(input.templeId);
    expect(body.pujaTypeId).toBe(input.pujaTypeId);
    expect(body.templePujaOfferingId).toBe(input.templePujaOfferingId);
    expect(body.scheduledDate).toBe("2030-01-01");
    expect(body.prasadDeliveryRequested).toBe(true);
    expect(body.prasadDeliveryAddressId).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("never invents a devotee when the list is empty", () => {
    const body = toCreateBookingBody({ ...input, devoteeNames: [] });
    expect(body.devoteeNames).toEqual([]);
  });
});
