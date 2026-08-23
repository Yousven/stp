import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: string;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshTtl as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as unknown as AuthTokenPayload;
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as unknown as AuthTokenPayload;
}
