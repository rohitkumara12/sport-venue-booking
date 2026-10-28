import { prisma } from "../configs/prisma.client.config";

const CHECK_INTERVAL_MS = 30 * 1000;

// Kalau pengecekan sebelumnya belum selesai, panggilan berikutnya menunggu hasil yang sama
// (tidak menjalankan query dobel).
let running: Promise<void> | null = null;

/**
 * Mengubah status transaksi yang melewati batas waktu, lalu ikut mengubah booking-nya:
 * - PENDING (belum upload bukti) lewat 30 menit      -> transaksi & booking EXPIRED
 * - PROOF_SUBMITTED (admin belum respon) lewat 30 menit -> transaksi & booking CANCELLED
 * - Booking CONFIRMED yang jam mainnya sudah lewat     -> COMPLETED (boleh direview)
 * Booking EXPIRED/CANCELLED tidak lagi menahan slot, jadi slotnya otomatis kosong lagi.
 */
export function expireOverdueBookings(): Promise<void> {
  running ??= runExpiry().finally(() => {
    running = null;
  });
  return running;
}

async function runExpiry() {
  const now = new Date();

  const overdue = await prisma.transaction.findMany({
    where: {
      type: "BOOKING_PAYMENT",
      status: { in: ["PENDING", "PROOF_SUBMITTED"] },
      expiresAt: { lt: now },
    },
    select: { id: true, status: true, bookingId: true },
  });

  const unpaid = overdue.filter((t) => t.status === "PENDING");
  const unconfirmed = overdue.filter((t) => t.status === "PROOF_SUBMITTED");
  const bookingIds = (list: typeof overdue) => list.map((t) => t.bookingId).filter((id): id is string => id !== null);

  await prisma.$transaction([
    // Syarat status diulang di "where" supaya transaksi yang baru saja dikonfirmasi admin tidak ikut berubah.
    prisma.transaction.updateMany({
      where: { id: { in: unpaid.map((t) => t.id) }, status: "PENDING" },
      data: { status: "EXPIRED" },
    }),
    prisma.booking.updateMany({
      where: { id: { in: bookingIds(unpaid) }, status: "PENDING", transactions: { some: { status: "EXPIRED" } } },
      data: { status: "EXPIRED" },
    }),
    prisma.transaction.updateMany({
      where: { id: { in: unconfirmed.map((t) => t.id) }, status: "PROOF_SUBMITTED" },
      data: { status: "CANCELLED" },
    }),
    prisma.booking.updateMany({
      where: { id: { in: bookingIds(unconfirmed) }, status: "PENDING", transactions: { some: { status: "CANCELLED" } } },
      data: { status: "CANCELLED" },
    }),
    prisma.booking.updateMany({
      where: { status: "CONFIRMED", endTime: { lt: now } },
      data: { status: "COMPLETED" },
    }),
  ]);
}

export function startBookingExpiryJob() {
  const tick = () => expireOverdueBookings().catch((err) => console.error("[booking-expiry] gagal:", err));
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
}
