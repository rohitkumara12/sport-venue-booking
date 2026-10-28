import { Router } from "express";
import { authController } from "./auth.controllers";
import { validate } from "../../validator/validate";
import { registerSchema } from "../../validator/auth.validator";
import { authenticate, Authorize } from "../../middleware/auth.middleware";

export const AuthRoute = Router();

AuthRoute.post('/register',authController.register);
AuthRoute.post("/login",authController.login)
AuthRoute.get("/profile",authenticate,Authorize(['USER','ADMIN']),authController.profile)
AuthRoute.patch("/profile", authenticate,Authorize(["USER", "ADMIN"]), authController.updateProfile)
AuthRoute.patch("/change-password",authenticate,Authorize(["USER",'ADMIN']),authController.changePassword)
AuthRoute.post("/forgot-password",authController.forgotPassword,)
AuthRoute.post("/reset-password",authController.resetPassword)


export default AuthRoute;