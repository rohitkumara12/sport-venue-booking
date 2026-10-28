import { error } from "node:console";
import { ZodType } from "zod";
import { AppError } from "../errors/Apperror";

export function validate (schema: ZodType, data: unknown) : any {
    const result = schema.safeParse(data);

    if (!result.success) {
        const details = result.error.issues.map(
        (issue) => issue.message);

        throw new AppError (422,details?.join(','));
    }
    return result.data
}

