
import { email, z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(125).optional(),
    email: z.string().trim().email().max(125).optional(),
  }).refine(
    (data) => data.name !== undefined || data.email !== undefined,
    { message: "Minimal satu field harus diubah" }
  ),
});

export const changePasswordSchema = z.object({
    body : z.object({
        currentPassword : z
        .string()
        .min(1,"Password lama wajib diisi"),

        newPassword : z 
        .string()
        .min(8,"Password baru minimal 8 karakter"),

        confirmPassword : z
        .string()
        .min(1,"Konfirmasi password wajib diisi"),
    }).refine(
        (data) => data.newPassword === data.confirmPassword,
        {
            message : "Konfirmasi password tidak cocok",
            path : ["confirmPassword"],
        }
    ).refine (
        (data) => data.currentPassword !== data.newPassword,
        {
            message : "Password baru harus berbeda dari password lama",
            path: ["newPassword"]
        }
    ),
});

export const forgorPasswordSchema = z.object({
    body : z.object({
        email : z.string().trim() .email("Format email tidak valid"),
    }),
});

export const resetPasswordSchema = z.object({
    body : z.object({
        token : z.string().min(1,"Token reset wajib diisi"),
        newpassword : z.string() .min(8,"Password minimal 8 karakter"),
        confirmPassword : z.string().min(1,"konfirmasi password wajib diisi"),
    }) .refine(
        (data) => data.newpassword === data.confirmPassword,
        {
            message : "Konfirmasi password tidak cocok",
            path : ["confirmPassword"],
        },
    ),
});