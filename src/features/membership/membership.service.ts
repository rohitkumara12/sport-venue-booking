import { string } from "zod";
import { prisma } from "../../configs/prisma.client.config"
import { AppError } from "../../errors/Apperror";
import { CreateBookingInput } from "../../validator/booking.validator";
import { CreateMembershipPlanInput, UpdateMembershipPlanInput } from "../../validator/membership.validator";
import { ADMIN_WINDOW_MINUTES, deadlineFromNow, PAYMENT_WINDOW_MINUTES } from "../../lib/schedule";
import { members } from "zod/v4/core/util.cjs";

export class MembershipService {
    // Customer: mengambil seluruh membership milik user yang login
static async getMyMemberships(userId: string) {
    return await prisma.customerMembership.findMany({
        where: {
            userId,
        },
        include: {
            membershipPlan: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                    sessionCount: true,
                    durationDays: true,
                },
            },
            transactions: {
                where: {
                    type: "MEMBERSHIP_PURCHASE",
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 1,
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    paymentProofUrl: true,
                    expiresAt: true,
                    createdAt: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
    static async getActivePlans() {
        return await prisma.membershipPlan.findMany({
            where : {
                isActive: true,
            },
            orderBy : {
                createdAt : "desc",
            },
        });
    }

    static async getAllPlans() {
        return await prisma.membershipPlan.findMany({
            orderBy : {
                createdAt : "desc"
            }
        });
    }

    static async getAllPlansById(id : string) {
        const plan = await prisma.membershipPlan.findFirst({
            where : {
                id,
                isActive : true,
            }

        });
        if (!plan) {
            throw new AppError(404,"Membership plan tidak ditemukan");
        }
        return plan;
    }
    static async createPlan (data: CreateMembershipPlanInput) {
        return await prisma.membershipPlan.create ({
            data,
        });
    }

    static async updatePlan(id : string,data : UpdateMembershipPlanInput) {
        const existingplan = await prisma.membershipPlan.findUnique ({
            where : {
                id
            }
        })
        if (!existingplan) {
            throw new AppError(404,"Membership plan tidak ditemukan")
        }
        return await prisma.membershipPlan.update({
            where : {
                id
            },
            data,
        })
    }
    static async DeactivePlan(id : string) {
        const existingplan = await prisma.membershipPlan.findUnique ({
            where : {
                id
            },
        })
        if (!existingplan) {
            throw new AppError(404,"Membership plan tidak ditemukan");
        }
        return await prisma.membershipPlan.update ({
            where : {id},
            data : {
                isActive: false
            },
        });
    }
    static async purchasemembership(userId: string,membershipPlanId: string) {
        const plan = await prisma.membershipPlan.findFirst({
            where : {
                id : membershipPlanId,
                isActive : true,
            },
        });
        if (!plan) {
            throw new AppError(404,"Membership plan tidak ditemukan atau sudah tidak aktif");
        }
        //Buat membership awal dengan status pending
        const result = await prisma.$transaction(async(tx)=> {
            const membership = await tx.customerMembership.create({
                data : {
                    userId,
                    membershipPlanId : plan.id,
                    totalSessions : plan.sessionCount,
                    remainingSessions : plan.sessionCount,
                    status : "PENDING"
                },
            });
            //Buat transaksi pembayaran membership
            const transaction = await tx.transaction.create({
                data : {
                    userId,
                    customerMembershipId : membership.id,
                    type : "MEMBERSHIP_PURCHASE",
                    status : "PENDING",
                    amount : plan.price,
                    expiresAt : deadlineFromNow(PAYMENT_WINDOW_MINUTES),
                },
            });
            return {
                membership,
                transaction,
                membershipPlan : {
                    id : plan.id,
                    name : plan.name,
                    price : Number(plan.price),
                    sessionCount : plan.sessionCount,
                    durationDays : plan.durationDays,
                }
            }
        });
        return result

    }
} 
export async function submitMembershipPaymentProof(
    customerMembershipId : string,
    userId : string,
    paymentProofUrl : string
) {
    const membership = await prisma.customerMembership.findFirst({
        where : {
            id : customerMembershipId,
            userId,
            status : "PENDING",
        },
        include : {
            transactions : {
                where : {
                    type : "MEMBERSHIP_PURCHASE"
                },
                orderBy  : {
                    createdAt : "desc"
                },
                take : 1,
            },
        },
    });

    if (!membership) {
       throw new AppError(404,"Membership tidak dtemukan");
    }
    const tx = membership.transactions[0]
    if (!tx || tx.status !== "PENDING") {
        throw new AppError(400,"Transaksi tidak sedang menunggu pembayaran");
    }
    const updated = await prisma.transaction.updateMany({
        where : {
            id : tx.id,
            userId,
            customerMembershipId,
            status : "PENDING",
            expiresAt : {gt : new Date()},
        },
        data : {
            status : "PROOF_SUBMITTED",
            paymentProofUrl,
            expiresAt : deadlineFromNow(ADMIN_WINDOW_MINUTES)
        },
    });
    if(updated.count === 0) {
        throw new AppError(400,"Batas waktu pembayaran sudah habis");
    }
    return prisma .customerMembership.findUnique({
        where : {
            id : customerMembershipId
        },
        include :{
            membershipPlan: true,
            transactions:{
                orderBy:{ createdAt : "desc"},
                take: 1,
            },
        },
    });
}
