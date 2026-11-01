import { UploadApiResponse } from "cloudinary";
import { Readable } from "stream";
import cloudinary from "../configs/cloudinary.config";

const uploadToCloudinary = (
    file : Express.Multer.File
): Promise<UploadApiResponse> =>{
    return new Promise((resolve,reject) =>{
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder : "court-kita/profile-images",
                resource_type : "image"
            },
            (error,result) =>{
                if(error) return reject(error);
                if(!result) return reject(new Error("Upload gagal"));

                resolve(result);
            }
        );
        Readable.from(file.buffer).pipe(uploadStream);
    });
};
export default uploadToCloudinary;