import { prisma } from "../../configs/prisma.client.config";
import { AppError } from "../../errors/Apperror";
import { expireOverdueBookings } from "../../jobs/booking-expiry.job";
import type { CreateReviewInput } from "../../validator/booking.validator";

export async function createReview(userId: string, input: CreateReviewInput) {
  // Menandai booking yang jam mainnya sudah lewat sebagai COMPLETED sebelum dicek.
  await expireOverdueBookings();

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, userId },
    include: { review: true },
  });
  if (!booking) throw new AppError(404, "Booking tidak ditemukan");
  if (booking.status !== "COMPLETED") {
    throw new AppError(400, "Review hanya bisa diberikan setelah jadwal main selesai");
  }
  if (booking.review) throw new AppError(409, "Booking ini sudah direview");

  return prisma.review.create({
    data: {
      userId,
      bookingId: booking.id,
      rating: input.rating,
      comment: input.comment || null,
    },
  });
}
