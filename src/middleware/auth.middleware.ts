import { Response,Request } from "express"
import { NextFunction } from "express"
import { AppError } from "../errors/Apperror";
import { Jwt } from "../lib/jwt";
import 'dotenv/config'
import jwt from 'jsonwebtoken'



export const authenticate = async (
    req : Request,
    res : Response,
    next : NextFunction,
) => {
    try{

    const cookies = req?.cookies;

    if (!cookies?.token) throw new AppError(401,'Token must be provide');

    const payload = await Jwt.verify(
        cookies?.token,
        process.env.JWT_SECRET_KEY!);
        console.log("[AUTH] JWT payload:", payload);


    res.locals.payload = payload;

    return next()
    } catch(error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError(401,"Token has expired. Please login again."))
        }
         if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, "Invalid token"));
    }
    return next(error)
    }
}


export const Authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = res.locals.payload;

    if (!payload?.role) {
      return next(new AppError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(payload.role)) {
      return next(
        new AppError(403, "Forbidden: insufficient permissions")
      );
    }

    return next();
  };
};
