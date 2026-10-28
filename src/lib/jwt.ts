import { SignOptions, sign, verify } from "jsonwebtoken";

export class Jwt {
  static async generate(
    payload: object,
    secretKey: string,
    options: SignOptions
  ) {
    return sign(payload, secretKey, options);
  }

  static async verify(token: string, secretKey: string) {
    return verify(token, secretKey);
  }
}