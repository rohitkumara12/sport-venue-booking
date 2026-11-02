import { addHours, setHours } from "date-fns";
import { prisma } from "../../configs/prisma.client.config";
import { AppError } from "../../errors/Apperror";
import { expireOverdueBookings } from "../../jobs/booking-expiry.job";
import { ADMIN_WINDOW_MINUTES, HOLDING_STATUSES, PAYMENT_WINDOW_MINUTES, deadlineFromNow, parseDay } from "../../lib/schedule";
import type { CreateBookingInput } from "../../validator/booking.validator";

const bookingInclude = {
  court: { select: { id: true, name: true, sportType: true, photos: true, pricePerHour: true } },
  transactions: { orderBy: { createdAt: "desc" as const }, take: 1 },
  review: { select: { id: true, rating: true, comment: true, createdAt: true } },
  customerMembership: { select: { id: true, membershipPlan: { select: { name: true } } } },
};

type BookingWithRelations = NonNullable<Awaited<ReturnType<typeof findBooking>>>;

const findBooking = (id: string) => prisma.booking.findUnique({ where: { id }, include: bookingInclude });

// Bentuk data yang dikirim ke frontend: Decimal diubah ke number, transaksi terakhir dijadikan satu objek.
function toBookingResponse(booking: BookingWithRelations) {
  const tx = booking.transactions[0] ?? null;
  return {
    id: booking.id,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalPrice: Number(booking.totalPrice),
    createdAt: booking.createdAt,
    court: { ...booking.court, pricePerHour: Number(booking.court.pricePerHour) },
    membership: booking.customerMembership
      ? { id: booking.customerMembership.id, planName: booking.customerMembership.membershipPlan.name }
      : null,
    transaction: tx && {
      id: tx.id,
      status: tx.status,
      amount: Number(tx.amount),
      paymentProofUrl: tx.paymentProofUrl,
      expiresAt: tx.expiresAt,
      confirmedAt: tx.confirmedAt,
    },
    review: booking.review,
    canReview: booking.status === "COMPLETED" && !booking.review,
  };
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  await expireOverdueBookings();

  const { dayStart } = parseDay(input.date);
  const startTime = setHours(dayStart, input.startHour);
  const endTime = addHours(startTime, input.hours);
  if (startTime <= new Date()) throw new AppError(400, "Jam yang dipilih sudah lewat");

  const court = await prisma.court.findFirst({ where: { id: input.courtId, isActive: true } });
  if (!court) throw new AppError(404, "Lapangan tidak ditemukan");

  const bookingId = await prisma.$transaction(async (tx) => {
    // Kunci baris court ini sampai transaksi selesai. Request booking lain untuk court yang sama
    // harus menunggu, jadi dua orang tidak bisa memesan slot yang sama bersamaan (double booking).
    await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${court.id} FOR UPDATE`;

    const clash = await tx.booking.findFirst({
      where: {
        courtId: court.id,
        status: { in: [...HOLDING_STATUSES] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (clash) throw new AppError(409, "Slot ini baru saja dipesan orang lain. Pilih jam lain.");

    if (input.customerMembershipId) {
      // 1 sesi membership = 1 jam main.
      const membership = await tx.customerMembership.findFirst({
        where: { id: input.customerMembershipId, userId, status: "ACTIVE" },
      });
      if (!membership) throw new AppError(404, "Membership aktif tidak ditemukan");
      if ((membership.startsAt && startTime < membership.startsAt) || (membership.expiresAt && endTime > membership.expiresAt)) {
        throw new AppError(400, "Jadwal ini di luar masa berlaku membership");
      }

      // Syarat sisa sesi dicek di query update, supaya sesi tidak bisa terpakai dua kali bersamaan.
      const used = await tx.customerMembership.updateMany({
        where: { id: membership.id, remainingSessions: { gte: input.hours } },
        data: { remainingSessions: { decrement: input.hours } },
      });
      if (used.count === 0) throw new AppError(400, "Sisa sesi membership tidak cukup");
      await tx.customerMembership.updateMany({
        where: { id: membership.id, remainingSessions: 0 },
        data: { status: "USED_UP" },
      });

      const booking = await tx.booking.create({
        data: {
          userId,
          courtId: court.id,
          customerMembershipId: membership.id,
          startTime,
          endTime,
          totalPrice: 0,
          status: "CONFIRMED",
        },
      });
      return booking.id;
    }

    const amount = Number(court.pricePerHour) * input.hours;
    const booking = await tx.booking.create({
      data: {
        userId,
        courtId: court.id,
        startTime,
        endTime,
        totalPrice: amount,
        status: "PENDING",
        transactions: {
          create: {
            userId,
            type: "BOOKING_PAYMENT",
            amount,
            status: "PENDING",
            expiresAt: deadlineFromNow(PAYMENT_WINDOW_MINUTES),
          },
        },
      },
    });
    return booking.id;
  });

  return toBookingResponse((await findBooking(bookingId))!);
}

export async function listMyBookings(userId: string) {
  await expireOverdueBookings();
  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  });
  return bookings.map(toBookingResponse);
}

export async function getBooking(id: string, user: { id: string; role: string }) {
  await expireOverdueBookings();
  const booking = await findBooking(id);
  // Booking milik orang lain dianggap tidak ada (kecuali admin).
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) {
    throw new AppError(404, "Booking tidak ditemukan");
  }
  return toBookingResponse(booking);
}

export async function submitPaymentProof(bookingId: string, userId: string, paymentProofUrl: string) {
  await expireOverdueBookings();

  const booking = await findBooking(bookingId);
  if (!booking || booking.userId !== userId) throw new AppError(404, "Booking tidak ditemukan");

  const tx = booking.transactions[0];
  if (!tx || tx.status !== "PENDING") throw new AppError(400, "Transaksi ini tidak sedang menunggu pembayaran");

  // Setelah bukti diupload, batas waktu berganti menjadi 30 menit untuk admin.
  const updated = await prisma.transaction.updateMany({
    where: { id: tx.id, status: "PENDING", expiresAt: { gt: new Date() } },
    data: {
      status: "PROOF_SUBMITTED",
      paymentProofUrl,
      expiresAt: deadlineFromNow(ADMIN_WINDOW_MINUTES),
    },
  });
  if (updated.count === 0) throw new AppError(400, "Batas waktu pembayaran sudah habis");

  return toBookingResponse((await findBooking(bookingId))!);
}

export async function listAvailableMemberships(userId: string) {
  const memberships = await prisma.customerMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      remainingSessions: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { expiresAt: "asc" },
    include: { membershipPlan: { select: { name: true } } },
  });
  return memberships.map((m) => ({
    id: m.id,
    planName: m.membershipPlan.name,
    remainingSessions: m.remainingSessions,
    startsAt: m.startsAt,
    expiresAt: m.expiresAt,
  }));
}

// ---------- Admin ----------

export async function listTransactions(status: string) {
  await expireOverdueBookings();
  const transactions = await prisma.transaction.findMany({
    where: { type: "BOOKING_PAYMENT", status: status as never },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      booking: { include: { court: { select: { id: true, name: true } } } },
    },
  });
  return transactions.map((t) => ({
    id: t.id,
    status: t.status,
    amount: Number(t.amount),
    paymentProofUrl: t.paymentProofUrl,
    expiresAt: t.expiresAt,
    updatedAt: t.updatedAt,
    user: t.user,
    booking: t.booking && {
      id: t.booking.id,
      startTime: t.booking.startTime,
      endTime: t.booking.endTime,
      court: t.booking.court,
    },
  }));
}

async function decideTransaction(id: string, decision: "PAID" | "REJECTED") {
  await expireOverdueBookings();

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) throw new AppError(404, "Transaksi tidak ditemukan");

  await prisma.$transaction(async (db) => {
    // Hanya bisa diputuskan selama masih menunggu konfirmasi dan belum lewat 30 menit.
    const updated = await db.transaction.updateMany({
      where: { id, status: "PROOF_SUBMITTED", expiresAt: { gt: new Date() } },
      data: { status: decision, confirmedAt: new Date() },
    });
    if (updated.count === 0) throw new AppError(400, "Transaksi ini sudah tidak menunggu konfirmasi");

    if (tx.bookingId) {
      await db.booking.update({
        where: { id: tx.bookingId },
        // Ditolak = slot dilepas lagi untuk customer lain.
        data: { status: decision === "PAID" ? "CONFIRMED" : "CANCELLED" },
      });
    }
  });

  return { id, status: decision };
}

export const confirmTransaction = (id: string) => decideTransaction(id, "PAID");
export const rejectTransaction = (id: string) => decideTransaction(id, "REJECTED");
