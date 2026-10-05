import type { AdminTemple } from './temples-api';

export interface FormState {
  name: string;
  description: string;
  deityPrimary: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: string;
  lng: string;
}

export const toForm = (t: AdminTemple): FormState => ({
  name: t.name,
  description: t.description ?? '',
  deityPrimary: t.deityPrimary,
  addressLine: t.addressLine ?? '',
  city: t.city,
  state: t.state,
  pincode: t.pincode ?? '',
  lat: String(t.lat),
  lng: String(t.lng),
});

/** Client-side mirror of the API rules, so the admin sees the problem before submitting. */
export function validateForm(f: FormState): Record<string, string> {
  const errs: Record<string, string> = {};
  if (f.name.trim().length < 2) errs.name = 'Name is required.';
  if (f.description.trim().length < 2) errs.description = 'Description is required.';
  if (f.deityPrimary.trim().length < 2) errs.deityPrimary = 'Deity is required.';
  if (f.addressLine.trim().length < 2) errs.addressLine = 'Address is required.';
  if (!f.city.trim()) errs.city = 'City is required.';
  if (!f.state.trim()) errs.state = 'State is required.';
  if (!/^\d{6}$/.test(f.pincode.trim())) errs.pincode = 'Pincode must be exactly 6 digits.';
  const lat = Number(f.lat);
  const lng = Number(f.lng);
  if (f.lat.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) errs.lat = 'Latitude must be between -90 and 90.';
  if (f.lng.trim() === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) errs.lng = 'Longitude must be between -180 and 180.';
  return errs;
}
