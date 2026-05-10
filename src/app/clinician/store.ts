// Clinician-side localStorage stores for listings and bookings.
// These will be replaced by backend API calls once the server endpoints are built.

export interface ClinicianListing {
  id: string;
  title: string;
  description: string;
  category: 'metabolic' | 'mental-health' | 'lifestyle' | 'diagnostics' | 'other';
  price: number;       // GBP
  duration: number;    // minutes
  availability: string;
  isActive: boolean;
  createdAt: number;
}

export interface ClinicianBooking {
  id: string;
  patientName: string;
  patientEmail: string;
  listingTitle: string;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // e.g. "10:00"
  price: number;
  duration: number;
  notes: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'no-show';
  bookedAt: number;
}

const LISTINGS_KEY = 'meo_clinician_listings';
const BOOKINGS_KEY = 'meo_clinician_bookings';

// ─── Listings ─────────────────────────────────────────────────────────────────

export function getListings(): ClinicianListing[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LISTINGS_KEY) ?? '[]'); } catch { return []; }
}

export function saveListing(l: Omit<ClinicianListing, 'id' | 'createdAt'>): ClinicianListing {
  const record: ClinicianListing = { ...l, id: `lst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
  localStorage.setItem(LISTINGS_KEY, JSON.stringify([record, ...getListings()]));
  return record;
}

export function updateListing(id: string, patch: Partial<ClinicianListing>): void {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(getListings().map((l) => (l.id === id ? { ...l, ...patch } : l))));
}

export function deleteListing(id: string): void {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(getListings().filter((l) => l.id !== id)));
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export function getClinicianBookings(): ClinicianBooking[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) ?? '[]'); } catch { return []; }
}

export function saveClinicianBooking(b: Omit<ClinicianBooking, 'id' | 'bookedAt' | 'status'>): ClinicianBooking {
  const record: ClinicianBooking = { ...b, id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, bookedAt: Date.now(), status: 'upcoming' };
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify([record, ...getClinicianBookings()]));
  return record;
}

export function updateBookingStatus(id: string, status: ClinicianBooking['status']): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(getClinicianBookings().map((b) => (b.id === id ? { ...b, status } : b))));
}

export function deleteClinicianBooking(id: string): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(getClinicianBookings().filter((b) => b.id !== id)));
}
