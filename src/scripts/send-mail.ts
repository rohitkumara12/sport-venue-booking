import { error } from "console";
import { sendRegisterEmail } from "../lib/transporter.lib"
import "dotenv/config";

const testmail = async() =>{
    const result = await sendRegisterEmail(
        "rohiitkumara@gmail.com",
        "Rohit",
    );
    console.log("Email berhasil dikirim",result.messageId)
};

testmail().catch((error) =>{
    console.error("email gagal dikirim",error.message)
})