import { prisma } from "../../configs/prisma.client.config";
import { AppError } from "../../errors/Apperror";
import { HOLDING_STATUSES, TOTAL_SLOTS, buildSlots, parseDay } from "../../lib/schedule";
import { expireOverdueBookings } from "../../jobs/booking-expiry.job";

export interface CourtFilters {
  search?: string;
  sportType?: string;
  date?: string;
}

export interface CreateCourtInput {
  name: string;
  sportType: string;
  pricePerHour: number;
  description?: string;
  photos?: string[];
}

// Review terhubung ke court lewat booking, jadi rating dihitung manual per court.
async function getRatings(courtIds: string[]) {
  const reviews = await prisma.review.findMany({
    where: { booking: { courtId: { in: courtIds } } },
    select: { rating: true, booking: { select: { courtId: true } } },
  });

  const stats = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    const stat = stats.get(review.booking.courtId) ?? { total: 0, count: 0 };
    stat.total += review.rating;
    stat.count += 1;
    stats.set(review.booking.courtId, stat);
  }
  return stats;
}

export async function listCourts({ search, sportType, date }: CourtFilters) {
  const { dayStart, dayEnd } = parseDay(date);
  await expireOverdueBookings();

  const courts = await prisma.court.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(sportType && { sportType }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: {
          status: { in: [...HOLDING_STATUSES] },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });

  const ratings = await getRatings(courts.map((c) => c.id));

  return courts.map(({ bookings, ...court }) => {
    const slots = buildSlots(dayStart, bookings);
    const rating = ratings.get(court.id);
    return {
      id: court.id,
      name: court.name,
      description: court.description,
      sportType: court.sportType,
      pricePerHour: Number(court.pricePerHour),
      photos: court.photos,
      totalSlots: TOTAL_SLOTS,
      availableSlots: slots.filter((s) => s.isAvailable).length,
      averageRating: rating ? Math.round((rating.total / rating.count) * 10) / 10 : null,
      reviewCount: rating?.count ?? 0,
    };
  });
}

export async function getCourtDetail(id: string, date?: string) {
  const { dayStart, dayEnd } = parseDay(date);
  await expireOverdueBookings();

  const court = await prisma.court.findFirst({
    where: { id, isActive: true },
    include: {
      bookings: {
        where: {
          status: { in: [...HOLDING_STATUSES] },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });
  if (!court) throw new AppError(404, "Lapangan tidak ditemukan");

  const { bookings, ...rest } = court;
  const slots = buildSlots(dayStart, bookings);
  const rating = (await getRatings([court.id])).get(court.id);

  return {
    id: rest.id,
    name: rest.name,
    description: rest.description,
    sportType: rest.sportType,
    pricePerHour: Number(rest.pricePerHour),
    photos: rest.photos,
    totalSlots: TOTAL_SLOTS,
    availableSlots: slots.filter((s) => s.isAvailable).length,
    averageRating: rating ? Math.round((rating.total / rating.count) * 10) / 10 : null,
    reviewCount: rating?.count ?? 0,
    slots,
  };
}

export async function createCourt(input: CreateCourtInput) {
  const court = await prisma.court.create({
    data: {
      name: input.name,
      sportType: input.sportType,
      pricePerHour: input.pricePerHour,
      description: input.description || null,
      photos: input.photos ?? [],
    },
  });
  return { ...court, pricePerHour: Number(court.pricePerHour) };
}

export async function listCourtReviews(courtId: string) {
  const reviews = await prisma.review.findMany({
    where: { booking: { courtId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true, profile_Image: true } },
    },
  });
  return reviews;
}
