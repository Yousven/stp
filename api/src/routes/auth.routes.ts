import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { HttpError } from "../middleware/errorHandler.js";

export const authRouter = Router();

// Kaitse jõhkra jõu rünnete eest sisselogimisel.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Port: public/authenticate.php
authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "Vale kasutajanimi või parool.");
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, username: user.username, role: user.role },
    });
  })
);

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, "Refresh-token on vale või aegunud.");
    }
    const { sub, username, role } = payload;
    res.json({ accessToken: signAccessToken({ sub, username, role }) });
  })
);

// Stateless JWT — klient kustutab tokenid lokaalselt. Vt api/README.md
// "Teadaolevad lihtsustused" täieliku tokeni tühistamise kohta.
authRouter.post("/logout", (_req, res) => {
  res.status(204).end();
});
