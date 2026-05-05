export interface BookingRecord {
  id: string;
  therapistId: string;
  therapistName: string;
  therapistImage: string;
  therapistAvatar: string;
  therapistAvatarColor: string;
  day: string;
  slot: string;
  price: number;
  sessionLength: number;
  note: string;
  bookedAt: number; // unix ms
  status: 'upcoming' | 'cancelled';
}

const KEY = 'meo_therapy_bookings';

export function getBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveBooking(b: Omit<BookingRecord, 'id' | 'bookedAt' | 'status'>): BookingRecord {
  const record: BookingRecord = {
    ...b,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    bookedAt: Date.now(),
    status: 'upcoming',
  };
  const existing = getBookings();
  localStorage.setItem(KEY, JSON.stringify([record, ...existing]));
  return record;
}

export function cancelBooking(id: string): void {
  const bookings = getBookings().map((b) =>
    b.id === id ? { ...b, status: 'cancelled' as const } : b,
  );
  localStorage.setItem(KEY, JSON.stringify(bookings));
}
