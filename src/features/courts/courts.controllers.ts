import { Request, Response } from "express";
import { validateCreateCourt } from "../../validator/validator";
import { createCourt, getCourtDetail, listCourtReviews, listCourts } from "./courts.services";

const queryString = (value: unknown) => (typeof value === "string" && value !== "" ? value : undefined);

// GET /courts?search=&sportType=&date=yyyy-MM-dd
export const getCourtsController = async (req: Request, res: Response) => {
  const courts = await listCourts({
    search: queryString(req.query.search),
    sportType: queryString(req.query.sportType),
    date: queryString(req.query.date),
  });
  res.status(200).json({ success: true, message: "Daftar lapangan", data: courts });
};

// GET /courts/:id?date=yyyy-MM-dd  (detail + slot jam untuk tanggal itu)
export const getCourtDetailController = async (req: Request<{ id: string }>, res: Response) => {
  const court = await getCourtDetail(req.params.id, queryString(req.query.date));
  res.status(200).json({ success: true, message: "Detail lapangan", data: court });
};

// GET /courts/:id/reviews
export const getCourtReviewsController = async (req: Request<{ id: string }>, res: Response) => {
  const reviews = await listCourtReviews(req.params.id);
  res.status(200).json({ success: true, message: "Ulasan lapangan", data: reviews });
};

// POST /courts  (admin)
export const createCourtController = async (req: Request, res: Response) => {
  const court = await createCourt(validateCreateCourt(req.body));
  res.status(201).json({ success: true, message: "Lapangan berhasil dibuat", data: court });
};
