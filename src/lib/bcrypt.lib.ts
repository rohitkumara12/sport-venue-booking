import bcrypt from "bcryptjs";

export class Bcrypt{
    static async hashPassword(
        plainPassword : string ,
        saltRounds : number = 10){

        return bcrypt.hash(plainPassword,saltRounds)
    }
    static async comparePassword(
        plainPassword : string , 
        HashedPassword : string){
            
        return bcrypt.compare(plainPassword,HashedPassword)
    }
}