import { Router } from "express";
import { authenticate, Authorize } from "../../middleware/auth.middleware";
import {
  confirmTransactionController,
  createBookingController,
  getBookingController,
  listMembershipsController,
  listMyBookingsController,
  listTransactionsController,
  rejectTransactionController,
  submitPaymentProofController,
} from "./bookings.controllers";

// Semua route booking butuh login.
export const bookingRouter = Router();
bookingRouter.use(authenticate, Authorize(["USER", "ADMIN"]));

bookingRouter.post("/", createBookingController);
bookingRouter.get("/me", listMyBookingsController);
bookingRouter.get("/memberships", listMembershipsController);
bookingRouter.get("/:id", getBookingController);
bookingRouter.patch("/:id/payment-proof", submitPaymentProofController);

// Konfirmasi pembayaran, khusus admin.
export const adminTransactionRouter = Router();
adminTransactionRouter.use(authenticate, Authorize(["ADMIN"]));

adminTransactionRouter.get("/", listTransactionsController);
adminTransactionRouter.patch("/:id/confirm", confirmTransactionController);
adminTransactionRouter.patch("/:id/reject", rejectTransactionController);
