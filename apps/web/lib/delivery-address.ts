/**
 * CM-06 (2026-08-13, P0) — the web half of the prasad-delivery address
 * contract.
 *
 * The booking wizard used to validate the address inline with two India-only
 * regexes that mirrored the API's:
 *
 *   if (!/^\d{6}$/.test(address.pincode.trim()))      -> 'Enter valid 6-digit pincode'
 *   if (!/^[6-9]\d{9}$/.test(address.phone.trim()))   -> 'Enter valid 10-digit phone number'
 *
 * There was no country field in the entire 2,341-line page, so a US ZIP, a UK
 * postcode and any international mobile were rejected by the form — and, if
 * they had got past it, by the API too.
 *
 * The rules now live once, in `@poojly/shared`, and this module is only the
 * adapter that maps them onto the wizard's `errors` keys (`addr_*`). Keeping
 * the shape of the return value identical to what the page already produced
 * means the fix does not disturb the fee-disclosure or draft-restore logic
 * around it.
 *
 * Billing is unaffected: every booking is still charged in INR through
 * Razorpay. This is address plumbing, not a currency rail.
 */
import {
  DELIVERY_COUNTRIES,
  DEFAULT_DELIVERY_COUNTRY,
  getDeliveryCountry,
  isPostalCodeRequired,
  isStateRequired,
  postalCodeLabel,
  stateLabel,
  validateDeliveryPhone,
  validatePostalCode,
  validateStateProvince,
  // Imported via the dedicated subpath, NOT the package root.
  //
  // @poojly/shared's barrels use NodeNext-style `./foo.js` specifiers pointing
  // at .ts sources, which apps/api needs at runtime under Node ESM. next.config
  // teaches WEBPACK to map .js -> .ts via resolve.extensionAlias, but that hook
  // only applies to the webpack bundler — Turbopack never sees it, and this app
  // runs `next dev --turbopack`. Every previous web import of this package was
  // `import type`, which is erased before resolution, so the gap stayed hidden
  // until CM-06 added the first VALUE import and every page 500'd with
  // "Can't resolve './constants/index.js'".
  //
  // `./delivery-address` maps straight to the source file, which imports only
  // zod — no barrel hop, so both bundlers resolve it. Do not "simplify" this
  // back to '@poojly/shared' without first giving Turbopack an equivalent
  // extension alias.
} from '@poojly/shared/delivery-address';

export interface DeliveryAddressForm {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  country: string;
}

/** Country options for the wizard's <select>, India first. */
export const DELIVERY_COUNTRY_OPTIONS: ReadonlyArray<{ code: string; name: string }> =
  DELIVERY_COUNTRIES.map((c) => ({ code: c.code, name: c.name }));

export function emptyDeliveryAddress(): DeliveryAddressForm {
  return {
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    country: DEFAULT_DELIVERY_COUNTRY,
  };
}

/** Field labels + placeholders that change with the selected country. */
export function deliveryFieldHints(country: string) {
  const c = getDeliveryCountry(country);
  return {
    postalLabel: postalCodeLabel(country),
    postalPlaceholder: c?.postalExample ?? 'Postal code',
    postalRequired: isPostalCodeRequired(country),
    stateLabel: stateLabel(country),
    stateRequired: isStateRequired(country),
    phonePlaceholder: c?.phoneExample ?? '+91 98765 43210',
    dialCode: c?.dialCode ?? '+91',
  };
}

/**
 * Validate the prasad delivery block.
 *
 * Returns a record keyed exactly as the wizard's `errors` state expects, so the
 * call site stays a one-liner. Empty object === valid.
 */
export function validateDeliveryAddress(
  address: DeliveryAddressForm,
): Record<string, string> {
  const errs: Record<string, string> = {};
  const country = address.country || DEFAULT_DELIVERY_COUNTRY;

  if (!getDeliveryCountry(country)) {
    errs.addr_country = 'We do not deliver prasad to that country yet';
  }

  if (!address.fullName.trim()) errs.addr_name = 'Name is required';
  if (!address.line1.trim()) errs.addr_line1 = 'Address line 1 is required';
  if (!address.city.trim()) errs.addr_city = 'City is required';

  const stateErr = validateStateProvince(address.state, country);
  if (stateErr) errs.addr_state = stateErr;

  const postalErr = validatePostalCode(address.pincode, country);
  if (postalErr) errs.addr_pincode = postalErr;

  const phoneErr = validateDeliveryPhone(address.phone, country);
  if (phoneErr) errs.addr_phone = phoneErr;

  return errs;
}
