import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type AuthTokenPayload } from "../utils/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Failide allalaadimislingid (nt raportid) ei saa Authorization päist
  // seada, seega lubame tokeni ka ?token= parameetrina. Kasutatakse ainult
  // lühikese elueaga access token'itega, mitte refresh token'itega.
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : queryToken;

  if (!token) {
    res.status(401).json({ error: "Autentimine puudub." });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token on vale või aegunud." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Ligipääs keelatud." });
    return;
  }
  next();
}
