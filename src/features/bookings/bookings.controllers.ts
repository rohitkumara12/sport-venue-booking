import { Request, Response } from "express";
import { validate } from "../../validator/validate";
import {
  createBookingSchema,
  paymentProofSchema,
  transactionIdSchema,
  transactionListSchema,
} from "../../validator/booking.validator";
import {
  confirmTransaction,
  createBooking,
  getBooking,
  listAvailableMemberships,
  listMyBookings,
  listTransactions,
  rejectTransaction,
  submitPaymentProof,
} from "./bookings.services";

// Diisi oleh middleware authenticate dari JWT di cookie.
const currentUser = (res: Response) => res.locals.payload as { id: string; role: string };

// POST /bookings  body: { courtId, date, startHour, hours, customerMembershipId? }
export const createBookingController = async (req: Request, res: Response) => {
  const { body } = validate(createBookingSchema, { body: req.body });
  const booking = await createBooking(currentUser(res).id, body);
  res.status(201).json({ success: true, message: "Booking berhasil dibuat", data: booking });
};

// GET /bookings/me
export const listMyBookingsController = async (_req: Request, res: Response) => {
  const bookings = await listMyBookings(currentUser(res).id);
  res.status(200).json({ success: true, message: "Daftar booking", data: bookings });
};

// GET /bookings/memberships  (membership aktif yang bisa dipakai untuk booking)
export const listMembershipsController = async (_req: Request, res: Response) => {
  const memberships = await listAvailableMemberships(currentUser(res).id);
  res.status(200).json({ success: true, message: "Membership aktif", data: memberships });
};

// GET /bookings/:id
export const getBookingController = async (req: Request<{ id: string }>, res: Response) => {
  const booking = await getBooking(req.params.id, currentUser(res));
  res.status(200).json({ success: true, message: "Detail booking", data: booking });
};

// PATCH /bookings/:id/payment-proof  body: { paymentProofUrl }
export const submitPaymentProofController = async (req: Request, res: Response) => {
  const { params, body } = validate(paymentProofSchema, { params: req.params, body: req.body });
  const booking = await submitPaymentProof(params.id, currentUser(res).id, body.paymentProofUrl);
  res.status(200).json({ success: true, message: "Bukti bayar terkirim, menunggu konfirmasi admin", data: booking });
};

// GET /admin/transactions?status=PROOF_SUBMITTED
export const listTransactionsController = async (req: Request, res: Response) => {
  const { query } = validate(transactionListSchema, { query: req.query });
  const transactions = await listTransactions(query.status);
  res.status(200).json({ success: true, message: "Daftar transaksi", data: transactions });
};

// PATCH /admin/transactions/:id/confirm
export const confirmTransactionController = async (req: Request, res: Response) => {
  const { params } = validate(transactionIdSchema, { params: req.params });
  const result = await confirmTransaction(params.id);
  res.status(200).json({ success: true, message: "Pembayaran diterima", data: result });
};

// PATCH /admin/transactions/:id/reject
export const rejectTransactionController = async (req: Request, res: Response) => {
  const { params } = validate(transactionIdSchema, { params: req.params });
  const result = await rejectTransaction(params.id);
  res.status(200).json({ success: true, message: "Pembayaran ditolak", data: result });
};
