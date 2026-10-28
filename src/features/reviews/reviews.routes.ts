import { Request, Response, Router } from "express";
import { authenticate, Authorize } from "../../middleware/auth.middleware";
import { validate } from "../../validator/validate";
import { createReviewSchema } from "../../validator/booking.validator";
import { createReview } from "./reviews.services";

const reviewRouter = Router();

// POST /reviews  body: { bookingId, rating (1-5), comment? }
reviewRouter.post("/", authenticate, Authorize(["USER", "ADMIN"]), async (req: Request, res: Response) => {
  const { body } = validate(createReviewSchema, { body: req.body });
  const review = await createReview(res.locals.payload.id, body);
  res.status(201).json({ success: true, message: "Terima kasih atas ulasanmu", data: review });
});

export default reviewRouter;
