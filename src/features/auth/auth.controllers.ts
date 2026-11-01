
import { loginSchema, registerSchema } from "../../validator/auth.validator";
import { authService } from "./auth.services";
import { validate } from "../../validator/validate";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../errors/Apperror";
import { changePasswordSchema, forgorPasswordSchema, resetPasswordSchema, updateProfileSchema } from "../../validator/profile.validator";


export class authController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { body } = validate(registerSchema, {
        body: req.body,
      });

      const user = await authService.register({ body });

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { body } = validate(loginSchema, {
        body: req.body,
      });

      const { token, userwithoutpassword } =
        await authService.login({ body });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "PRODUCTION",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: "User login successfully",
        data: userwithoutpassword,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async profile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const payload = res.locals.payload;

      if (!payload?.id) {
        throw new AppError(401, "Invalid authentication payload");
      }

      const user = await authService.getProfile(payload.id);

      return res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }
  
static async updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { body } = validate(updateProfileSchema, {
      body: req.body,
    });

    const payload = res.locals.payload;

    if (!payload?.id) {
      throw new AppError(401, "Invalid authentication payload");
    }

    const user = await authService.updateProfile(
      payload.id,
      body
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

static async changePassword (
    req : Request,
    res : Response,
    next : NextFunction
) {
    try {
        const {body} = validate(changePasswordSchema,{
            body : req.body
        });
        const payload = res.locals.payload;
        if (!payload?.id) {
            throw new AppError(401,"Invalid authentication payload");
        }
        const result = await authService.changePassword(
            payload.id,
            body
        );
        return res.status(200).json({
            succes : true,
            message : result.message,
        });
    } catch(error) {
        return next(error) ;
      
        }
    }

    static async forgotPassword(
      req : Request,
      res : Response,
      next : NextFunction,
    ) {
      try {
        const{body} = validate(forgorPasswordSchema,{
          body : req.body
        });

        const result = await authService.forgotPassword(body.email);

        return res.status(201).json({
          success : true,
          message : result.message,
        });
      } catch(error) {
        return next(error);
      }
    }

    static async resetPassword(
      req : Request,
      res : Response,
      next : NextFunction,
    ) {
      try {
        const {body} = validate(resetPasswordSchema, {
          body : req.body
        });

        const result = await authService.resetPassword(body);
        return res.status(200).json({
          success: true,
          message:result.message,
        });
      } catch(error) {
        return next(error);
      }
    }

    static async logout(
      req : Request,
      res : Response,
      next : NextFunction
    ) {
      try {
        res.clearCookie("token",{
          httpOnly : true,
          secure : process.env.NODE_ENV === "PRODUCTION",
          sameSite : "lax",
          path : "/",
        });
        res.status(200).json({
          message : "Logout berhasil",
        });
      } catch (error) {
        next(error);
      }
    }

    static async updateProfileImage(
      req : Request,
      res : Response,
      next : NextFunction
    ) {
      try {
        const payload = res.locals.payload;

        if (!payload?.id) {
          throw new AppError(401,"Invalid authentication payload")
        }
        if (!req.file) {
          throw new AppError(400,"Profile image is required");
        }

        const updateUser = await authService.updateProfileImage(
          payload.id,
          req.file
        );
        res.status(201).json({
          success : true,
          message : "profile image updated successfully",
          data : updateUser,
        });
      } catch(error) {
        return next(error)
      }
    }
}

