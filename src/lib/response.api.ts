import { AppError } from "../errors/Apperror";

const API_URL = "https://localhost:8002";

export async function loginRequest(data:{
    email : string;
    password : string;
}) {
    const response = await fetch(`${API_URL}/api/v1/auth/login`,{
        method : "POST",
        headers :{
            "Content-Type" : "application/json",
        },
        credentials : "include",
        body : JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Login gagal")
    }
    return result;
}