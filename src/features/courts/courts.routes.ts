import { Router } from "express";
import { authenticate, Authorize } from "../../middleware/auth.middleware";
import { createCourtController, getCourtDetailController, getCourtReviewsController, getCourtsController } from "./courts.controllers";

const courtRouter = Router();

courtRouter.get("/", getCourtsController);
courtRouter.get("/:id", getCourtDetailController);
courtRouter.get("/:id/reviews", getCourtReviewsController);
courtRouter.post("/", authenticate, Authorize(["ADMIN"]), createCourtController);

export default courtRouter;
