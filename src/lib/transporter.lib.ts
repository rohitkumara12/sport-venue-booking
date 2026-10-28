import nodemailer from "nodemailer/lib/nodemailer"
import "dotenv/config";

const transporter = nodemailer.createTransport({
service : "gmail",
auth :{
    user : 'rohittam498@gmail.com',
    pass : process?.env?.MAIL_PASS
},
secure : false,
tls:{
    rejectUnauthorized:false
},
});
export const sendRegisterEmail = async(email : string,name : string) =>{
    return transporter.sendMail({
        from : `CourtKita <${process.env.MAIL_USER}>`,
        to : email,
        subject : "Registration Successfully",
        html : `<h2> Welcome to CourtKita,${name}!</h2> 
                <p> Your Account has been registered Succesfully.</p>
                <p> You can now log in and start using our platform.</p>`,
                
    });
};

export const sendResetPasswordEmail = async (
    email : string,
    reseturl : string
) => {
    return transporter.sendMail({
        from: `CourtKita <${process.env.MAIL_USER}>`,
        to: email,
        subject : "Reset Your CourtKita Password",
        html: `<h2 Password reset Request</h2>
        <p> We received a request to reset your CourtKita password</p>
        <a href="${reseturl}"> Reset Password</a>
        <p> This link will expire in 15 minutes.</p>
        <p> If you did not request this,you can ignore this email.</p>`,
    })
}

export default transporter;