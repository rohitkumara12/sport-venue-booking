import { Request, Response } from "express";
import { MembershipService, submitMembershipPaymentProof } from "./membership.service";
import { validate } from "../../validator/validate";
import { createMembershipPlanSchema, membershipPlanIdSchema, purchaseMembershipSchema, updateMembershipPlanSchema } from "../../validator/membership.validator";
import { paymentProofSchema } from "../../validator/booking.validator";

 const currentUser = (res: Response) =>
  res.locals.payload as { id: string; role: string };

export class MembershipContollers{

   
    static async getActivePlans(req: Request,res : Response) {
        const plans = await MembershipService.getActivePlans();

        res.status(200).json({
            success : true,
            message : "Membership plans berhasil diambil",
            data : plans,
        });
    }

    static async getAllPlans (req : Request,res: Response) {
        const plans = await MembershipService.getAllPlans()
         res.status(200).json({
            success : true,
            message : "Membership plans berhasil diambil",
            data : plans,
        });
    }

    static async getPlanById(req : Request,res : Response) {
        const {params} = validate(membershipPlanIdSchema,{
            params : req.params,
    });
    const plan = await MembershipService.getAllPlansById(params.id);
    res.status(200).json({
      success: true,
      message: "Membership plan berhasil diambil",
      data: plan,
    });
}
static async createPlan(req : Request,res : Response) {
    console.log("REQUEST BODY:", req.body);

    const {body} = validate(createMembershipPlanSchema, {
        body : req.body,
    });
    const plan = await MembershipService.createPlan(body);
    res.status(200).json({
      success: true,
      message: "Membership plan berhasil dibuat",
      data: plan,
    });    
}     
static async updatePlan(req : Request,res: Response) {
    const {params,body} = validate(updateMembershipPlanSchema, {
        params : req.params,
        body : req.body
    });
    const plan = await MembershipService.updatePlan(params.id,body)

    res.status(200).json({
         success: true,
         message: "Membership plan berhasil diperbarui",
         data: plan,
       });
}


static async deactivePlan (req : Request ,res : Response) {
    const{params} = validate(membershipPlanIdSchema, {
        params : req.params
    });

    const plan = await MembershipService.DeactivePlan(params.id);
    res.status(200).json({
        success : true,
        message : "Membership plan berhasil dinonaktifkan",
        data : plan
    });
}

static async purchaseMembership(req : Request,res : Response) {
    const {body} = validate(purchaseMembershipSchema,{
        body : req.body
    });
    const result = await MembershipService.purchasemembership(
        currentUser(res).id,
        body.membershipPlanId
    );
    res.status(201).json({
        success : true,
        message : "Membership berhasil dilakukan,silahkan lakukan pembayaran",
        data : result
    });
}

static async submitPaymentProof(req : Request, res : Response) {
    const {params,body} = validate(paymentProofSchema,{
        params: req.params,
        body : req.body,
    });

    const membership = await submitMembershipPaymentProof(
        params.id,
        currentUser(res).id,
        body.paymentProofUrl
    );
    res.status(200).json({
        success : true,
        message : "Bukti bayar membership terkirim,menunggu konfirmasi admin",
        data : membership,
    });
}
static async getMyMemberships(req: Request, res: Response) {
    const memberships = await MembershipService.getMyMemberships(
        currentUser(res).id
    );

    res.status(200).json({
        success: true,
        message: "Daftar membership berhasil diambil",
        data: memberships,
    });
}

}