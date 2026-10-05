/**
 * Prasad delivery address (web wizard adapter).
 *
 * Owner decision 2026-10-06: prasad is delivered within India only. The
 * country is fixed to India (the wizard has no country selector), the pincode
 * must be exactly 6 digits and the state is required. The API enforces the
 * same rule (`prasadAddressProblem` in `@poojly/shared`), so the form and the
 * wire contract cannot drift. A booking WITHOUT prasad is unaffected, so an NRI
 * anywhere can still book — they just do not tick the prasad box.
 *
 * (CM-06, 2026-08-13, had briefly opened this to 50+ countries; that rule set
 * still lives in `@poojly/shared` but is no longer reachable from this form.)
 *
 * Billing is unaffected: every booking is still charged in INR through
 * Razorpay.
 */
import {
  DEFAULT_DELIVERY_COUNTRY,
  getDeliveryCountry,
  PRASAD_INDIA_ONLY_NOTE,
  validateDeliveryPhone,
  validateStateProvince,
  // Imported via the dedicated subpath, NOT the package root.
  //
  // @poojly/shared's barrels use NodeNext-style `./foo.js` specifiers pointing
  // at .ts sources, which apps/api needs at runtime under Node ESM. next.config
  // teaches WEBPACK to map .js -> .ts via resolve.extensionAlias, but that hook
  // only applies to the webpack bundler — Turbopack never sees it, and this app
  // runs `next dev --turbopack`.
  //
  // `./delivery-address` maps straight to the source file, which imports only
  // zod — no barrel hop, so both bundlers resolve it. Do not "simplify" this
  // back to '@poojly/shared' without first giving Turbopack an equivalent
  // extension alias.
} from '@poojly/shared/delivery-address';

/** Shown next to the prasad option and the address block. */
export const PRASAD_INDIA_ONLY_LINE = PRASAD_INDIA_ONLY_NOTE;

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

/** Labels + placeholders for the (India-only) prasad address fields. */
export function deliveryFieldHints() {
  const c = getDeliveryCountry(DEFAULT_DELIVERY_COUNTRY);
  return {
    postalLabel: 'Pincode',
    postalPlaceholder: c?.postalExample ?? '110001',
    postalRequired: true,
    stateRequired: true,
    stateLabel: 'State',
    phonePlaceholder: c?.phoneExample ?? '9876543210',
    dialCode: c?.dialCode ?? '+91',
  };
}

/**
 * Validate the prasad delivery block.
 *
 * Returns a record keyed exactly as the wizard's `errors` state expects, so the
 * call site stays a one-liner. Empty object === valid. Any country restored
 * from an old saved draft is ignored: India is the only destination.
 */
export function validateDeliveryAddress(
  address: DeliveryAddressForm,
): Record<string, string> {
  const errs: Record<string, string> = {};
  const country = DEFAULT_DELIVERY_COUNTRY;

  if (!address.fullName.trim()) errs.addr_name = 'Name is required';
  if (!address.line1.trim()) errs.addr_line1 = 'Address line 1 is required';
  if (!address.city.trim()) errs.addr_city = 'City is required';

  const stateErr = validateStateProvince(address.state, country);
  if (stateErr) errs.addr_state = stateErr;

  if (!/^\d{6}$/.test(address.pincode.trim())) {
    errs.addr_pincode = 'Enter a valid 6-digit pincode';
  }

  const phoneErr = validateDeliveryPhone(address.phone, country);
  if (phoneErr) errs.addr_phone = phoneErr;

  return errs;
}

/** The address as it goes on the wire: the country is always India for prasad. */
export function prasadAddressForApi(address: DeliveryAddressForm): DeliveryAddressForm {
  return { ...address, country: DEFAULT_DELIVERY_COUNTRY };
}
