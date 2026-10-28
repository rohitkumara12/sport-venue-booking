import { addHours, addMinutes, isValid, parse, setHours } from "date-fns";
import { AppError } from "../errors/Apperror";

// Jam operasional lapangan: 08:00 - 22:00, dibagi per 1 jam (14 slot per hari).
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
export const TOTAL_SLOTS = CLOSE_HOUR - OPEN_HOUR;

// Booking yang masih menahan slot. CANCELLED/EXPIRED dianggap slot kosong lagi.
export const HOLDING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

// Batas waktu upload bukti bayar, dan batas waktu admin menerima/menolak.
export const PAYMENT_WINDOW_MINUTES = 30;
export const ADMIN_WINDOW_MINUTES = 30;

export const deadlineFromNow = (minutes: number) => addMinutes(new Date(), minutes);

export interface BookedRange {
  startTime: Date;
  endTime: Date;
}

export function parseDay(date?: string): { dayStart: Date; dayEnd: Date } {
  const day = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();
  if (!isValid(day)) throw new AppError(400, "Format tanggal harus yyyy-MM-dd");
  const dayStart = setHours(day, 0);
  dayStart.setMinutes(0, 0, 0);
  return { dayStart, dayEnd: addHours(dayStart, 24) };
}

// Slot yang sudah terisi atau jamnya sudah lewat ditandai tidak tersedia.
export function buildSlots(dayStart: Date, bookings: BookedRange[]) {
  const now = new Date();
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const start = setHours(dayStart, OPEN_HOUR + i);
    const end = addHours(start, 1);
    const isBooked = bookings.some((b) => b.startTime < end && b.endTime > start);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${String(OPEN_HOUR + i).padStart(2, "0")}:00`,
      isAvailable: !isBooked && start > now,
    };
  });
}
