import { prisma } from "../../configs/prisma.client.config";
import { LoginInput, RegisterInput } from "../../validator/auth.validator";
import { AppError } from "../../errors/Apperror";
import { Bcrypt } from "../../lib/bcrypt.lib";
import { Jwt } from "../../lib/jwt";
import { email } from "zod";
import { sendRegisterEmail } from "../../lib/transporter.lib";
import { id } from "zod/v4/locales";
import { error } from "console";
export class authService{
    static async register ({body}: RegisterInput){
        const finduserbyemail = await prisma.user.findUnique({
            where :{
                email : body?.email
            }
        })
        if (finduserbyemail) throw new AppError(409,`email already registered`)

        const {confirmPassword, ...userdata} = body;

        const hashedPassword = await Bcrypt.hashPassword(userdata?.password)

        const user = await prisma.user.create({
            data :  {
            ...userdata,
            password: hashedPassword,
            role: "USER",
            profile_Image: "",
            createdAt: new Date(),
        },
        })
        try{
            await sendRegisterEmail(user.email,user.name)
        } catch (error){
            console.error("Gagal mengirim email registrasi",error);
        }
        const {password,...userwithoutpassword} = user;

        return userwithoutpassword
    }

    static async login({body}:LoginInput){
        const finduserbyemail = await prisma.user.findUnique({
            where : {
                email :  body?.email
            }
        })
    if(!finduserbyemail) throw new AppError(401,"email or password is incorrect")

    const IscomparePassword  = await Bcrypt.comparePassword(body?.password,finduserbyemail.password)
    if(!IscomparePassword) throw new AppError(401,'Email or password is incorrect')
    
    const secretKey = process.env.JWT_SECRET_KEY;
    if (!secretKey) throw new AppError(500,'JWT Secret has no configure')

    const token = await Jwt.generate(
        {
            id : finduserbyemail?.id,
            email : finduserbyemail?.email,
            role : finduserbyemail?.role
            
        },
        process.env.JWT_SECRET_KEY!,
        {expiresIn: '5h'}
)
    const {password,...userwithoutpassword} = finduserbyemail;

    return {
    token,
    userwithoutpassword,
    }
    }

static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where :{
            id : userId,
        },
        select :{
            id : true,
            name: true,
            email:true,
            role: true,
            profile_Image : true,
            createdAt: true,
            updatedAt: true,
        }
    });
    if (!user) {
        throw new AppError(404,"User Profile not found")
    }
    return user;
}

static async updateProfile(
    userId : string,
    body: {name?: string; email?: string}
) {
    const existingUser = await prisma.user.findUnique({
        where : {id : userId},
    });
    if (!existingUser) {
        throw new AppError(404,"User profile not found");
    }

    if(body.email && body.email !== existingUser.email) {
        const emailUsed = await prisma.user.findUnique({
            where : {email: body.email}
        });

        if (emailUsed) {
            throw new AppError(400,"Email already registered")
        }
    }
    const updatedUser = await prisma.user.update({
        where: { id : userId,},
        data : {
            ...(body.name !== undefined && {name : body.name}),
            ...(body.email !== undefined && {email : body.email})
        },
        select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profile_Image: true,
      createdAt: true,
      updatedAt: true,
    },
    })
    return updatedUser
}

static async changePassword(
    userId : string,
    body :{
        currentPassword : string;
        newPassword : string;
        confirmPassword : string;
    }
) {
    const user = await prisma.user.findUnique({
        where: {id : userId},
        select : {
            id : true,
            password: true,
        },
    });
    if (!user){
        throw new AppError(404,"User not found");
    }
    const isPasswordValid = await Bcrypt.comparePassword(
        body.currentPassword,
        user.password
    );

    if (!isPasswordValid) {
        throw new AppError(400,"Current password is incorrect");
    }
    const hashedPassword = await Bcrypt.hashPassword(
        body.newPassword
    );
    await prisma.user.update ({
        where :{id : userId},
        data : {
            password: hashedPassword,
        },
    });
    return {
        message : "Password changed successfully",
    };
}
}
