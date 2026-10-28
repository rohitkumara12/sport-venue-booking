import { addHours, isValid, parse, setHours } from "date-fns";
import { prisma } from "../../configs/prisma.client.config";
import { AppError } from "../../errors/Apperror";

// Jam operasional lapangan: 08:00 - 22:00, dibagi per 1 jam (14 slot per hari).
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const TOTAL_SLOTS = CLOSE_HOUR - OPEN_HOUR;

// Booking yang masih menahan slot. CANCELLED/EXPIRED dianggap slot kosong lagi.
const HOLDING_STATUSES = ["PENDING", "CONFIRMED"] as const;

interface BookedRange {
  startTime: Date;
  endTime: Date;
}

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

function parseDay(date?: string): { dayStart: Date; dayEnd: Date } {
  const day = date ? parse(date, "yyyy-MM-dd", new Date()) : new Date();
  if (!isValid(day)) throw new AppError(400, "Format tanggal harus yyyy-MM-dd");
  const dayStart = setHours(day, 0);
  dayStart.setMinutes(0, 0, 0);
  return { dayStart, dayEnd: addHours(dayStart, 24) };
}

function buildSlots(dayStart: Date, bookings: BookedRange[]) {
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const start = setHours(dayStart, OPEN_HOUR + i);
    const end = addHours(start, 1);
    const isBooked = bookings.some((b) => b.startTime < end && b.endTime > start);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${String(OPEN_HOUR + i).padStart(2, "0")}:00`,
      isAvailable: !isBooked,
    };
  });
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
