import { Router } from "express";
import { authenticate, Authorize } from "../../middleware/auth.middleware";
import { MembershipContollers } from "./membership.controllers";

export const MembershipRouter = Router()

MembershipRouter.get(
    "/",MembershipContollers.getActivePlans
)

MembershipRouter.get(
    "/admin",authenticate,Authorize(["ADMIN"]),
    MembershipContollers.getAllPlans)

    
    MembershipRouter.post("/",authenticate,Authorize(["ADMIN"]),MembershipContollers.createPlan)
    
    
    MembershipRouter.patch(
        "/:id",
        authenticate,
        Authorize(["ADMIN"]),
        MembershipContollers.updatePlan
    )
    MembershipRouter.get(
        "/my-memberships",
        authenticate,
        Authorize(["USER"]),
        MembershipContollers.getMyMemberships
    );
    MembershipRouter.get("/:id",MembershipContollers.getPlanById);

MembershipRouter.post(
    "/purchase",authenticate,
    Authorize(["USER"]),
    MembershipContollers.purchaseMembership)

MembershipRouter.delete(
    "/:id",
    authenticate,Authorize(["ADMIN"]),
    MembershipContollers.deactivePlan
)

MembershipRouter.patch(
    "/:id/payment-proof",
    authenticate,Authorize(["USER"]),
    MembershipContollers.submitPaymentProof
)