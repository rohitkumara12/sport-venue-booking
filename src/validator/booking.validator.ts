import { z } from "zod";
import { CLOSE_HOUR, OPEN_HOUR } from "../lib/schedule";

const MAX_HOURS = 4;

const idParams = z.object({ id: z.string().min(1, "Id wajib diisi") });

export const createBookingSchema = z.object({
  body: z
    .object({
      courtId: z.string().min(1, "Lapangan wajib dipilih"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus yyyy-MM-dd"),
      startHour: z.number().int().min(OPEN_HOUR, "Jam mulai di luar jam operasional").max(CLOSE_HOUR - 1, "Jam mulai di luar jam operasional"),
      hours: z.number().int().min(1, "Minimal 1 jam").max(MAX_HOURS, `Maksimal ${MAX_HOURS} jam per booking`),
      // Kalau diisi, booking memakai sesi membership (tanpa pembayaran).
      customerMembershipId: z.string().min(1).optional(),
    })
    .refine((b) => b.startHour + b.hours <= CLOSE_HOUR, {
      message: "Booking melewati jam tutup lapangan",
      path: ["hours"],
    }),
});

export const paymentProofSchema = z.object({
  params: idParams,
  body: z.object({
    paymentProofUrl: z.url({ protocol: /^https$/, error: "Bukti bayar harus berupa URL https" }),
  }),
});

export const transactionIdSchema = z.object({ params: idParams });

export const transactionListSchema = z.object({
  query: z.object({
    status: z
      .enum(["PENDING", "PROOF_SUBMITTED", "PAID", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED"])
      .default("PROOF_SUBMITTED"),
  }),
});

export const createReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, "Booking wajib dipilih"),
    rating: z.number().int().min(1, "Rating minimal 1").max(5, "Rating maksimal 5"),
    comment: z.string().trim().max(500, "Komentar maksimal 500 karakter").optional(),
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>["body"];
export type CreateReviewInput = z.infer<typeof createReviewSchema>["body"];
