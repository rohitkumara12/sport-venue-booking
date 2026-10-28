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

export default transporter;