import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AccessTokenPayload = {
  sub: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
};
