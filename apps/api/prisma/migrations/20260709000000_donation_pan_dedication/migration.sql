-- P0 #PBO-14 (2026-07-09): persist donor PAN (required ≥ ₹2,000 for 80G) and
-- the optional dedication message. DonationForm already collects + sends both,
-- but the create-order endpoint dropped them before INSERT, so the 80G receipt
-- omitted the donor PAN. Both columns are nullable (legacy rows + sub-₹2,000
-- donations have no PAN).

ALTER TABLE "donations" ADD COLUMN "donor_pan" TEXT;
ALTER TABLE "donations" ADD COLUMN "dedication" TEXT;
