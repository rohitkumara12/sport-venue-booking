
import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/Apperror";

export const errormiddleware = (
  error: unknown,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      data: {},
    });
  }

  console.error("Backend error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    data: {},
  });
};
