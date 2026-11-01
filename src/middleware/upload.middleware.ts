import { error } from "console";
import multer from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
    req : Request,
    file : Express.Multer.File,
    callback : multer.FileFilterCallback
) => {
    if (!file.mimetype.startsWith("image/")) {
        return callback(new Error("file harus berupa gambar"));
    }
    callback(null,true);
};

const upload = multer({
    storage,
    fileFilter,
    limits : {
        fileSize : 2 * 1024 * 1024,
    },
});

export default upload;