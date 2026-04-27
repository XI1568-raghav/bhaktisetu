-- Provider KYC stage 2: collect bank account + PAN before payouts can be
-- processed. Aadhaar is stored as last-4 + sha256 of full number; the
-- legal team holds the hash policy because we don't currently need to
-- reverse the digits, only confirm a match if challenged.
--
-- Provider may hold multiple roles (rare) but KYC is per-USER, not
-- per-role: a single payout flow uses one bank account regardless of
-- which provider profile earned the money.

CREATE TABLE "provider_kyc" (
  "user_id"            uuid PRIMARY KEY,
  "aadhaar_last4"      text,
  "aadhaar_hash"       text,
  "pan_number"         text,
  "bank_account_number" text,
  "bank_ifsc"          text,
  "bank_holder_name"   text,
  "verified"           boolean NOT NULL DEFAULT false,
  "verified_at"        timestamp(3),
  "rejection_reason"   text,
  "created_at"         timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_kyc_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,

  -- PAN is fixed format AAAAA9999A. Loose check; full validation belongs
  -- in the route layer where we can return a friendly error.
  CONSTRAINT "provider_kyc_pan_format"
    CHECK ("pan_number" IS NULL OR "pan_number" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

  -- IFSC is 11 chars, fifth is always 0. Loose check only.
  CONSTRAINT "provider_kyc_ifsc_format"
    CHECK ("bank_ifsc" IS NULL OR "bank_ifsc" ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),

  -- Aadhaar last-4 must be 4 digits when present.
  CONSTRAINT "provider_kyc_aadhaar_last4_format"
    CHECK ("aadhaar_last4" IS NULL OR "aadhaar_last4" ~ '^[0-9]{4}$')
);

CREATE INDEX "provider_kyc_verified_idx" ON "provider_kyc"("verified");
