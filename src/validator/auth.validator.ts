import { string, z } from "zod"

const name = z 
.string()
.trim()
.min(1,"Name is required")
.max(100,"Name must not exceed 100 characters");

const email = z
.email({
error : "Email format is incorrect",
})
.trim()
// .min(1,"Email is required")


const password = z 
.string()
.min(8,"Password must be at least 8 characters")
.max(25,"Password must not exceed 25 characters");

const confirmPassword = z
.string()
.min(1,'Confirm password is required field')

export const registerSchema = z.object({
    body : z.object({
        name,
        email,
        password,
        confirmPassword
    })
    .refine((data) => data.password === data.confirmPassword,{
        message : 'Password do not match',
        path : ['confirmPassword']
    })
});

export const loginSchema = z.object({
    body : z.object({
        email,
        password
    })
})

export const setPasswordUserSchema = z.object({
    params : z.object({
        userId : z.string().min(1,'User id is required fied')
    }),
    body : z.object({
        password,
        confirmPassword
    })
    
    });


export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>
