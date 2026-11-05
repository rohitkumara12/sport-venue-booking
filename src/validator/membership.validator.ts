import { z } from "zod";

const idParams = z.object({
  id: z.string().min(1, "Id membership wajib diisi"),
});

const membershipPlanBody = z.object({
  name: z.string().trim().min(1, "Nama membership wajib diisi").max(125),

  description: z.string().trim().max(1000).optional(),

  price: z.number().positive("Harga membership harus lebih dari 0"),

  sessionCount: z.number().int().min(1, "Minimal 1 sesi"),

  durationDays: z.number().int().min(1, "Durasi minimal 1 hari"),
});

export const createMembershipPlanSchema = z.object({
  body: membershipPlanBody,
});

export const updateMembershipPlanSchema = z.object({
  params: idParams,
  body: membershipPlanBody.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: "Minimal satu data harus diubah" },
  ),
});

export const membershipPlanIdSchema = z.object({
  params: idParams,
});

export const  purchaseMembershipSchema = z.object({
    body: z.object({
        membershipPlanId : z.string().min(1,"Membership plan wajib pilih"),
    }),
});

export type purchaseMembershipInput = z.infer<typeof purchaseMembershipSchema>["body"]

export type CreateMembershipPlanInput = z.infer<
  typeof createMembershipPlanSchema
>["body"];

export type UpdateMembershipPlanInput = z.infer<
  typeof updateMembershipPlanSchema
>["body"];