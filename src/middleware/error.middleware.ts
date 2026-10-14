import { error } from "node:console"
import { NextFunction } from "express"
import { Request,Response } from "express"

export const errormiddleware = 
 (error: unknown, _: Request, res: Response, __: NextFunction) => {
  if (error instanceof Error)
    return res.status(500).json({
      success: false,
      message: error?.message,
      data: {},
    })
}