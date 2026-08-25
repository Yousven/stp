import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const deviceTokensRouter = Router();
deviceTokensRouter.use(requireAuth);

const registerSchema = z.object({
  token: z.string().min(1).max(255),
  platform: z.enum(["ios", "android", "web"]),
});

/**
 * Registreerib seadme push-teavituste jaoks.
 *
 * Token on globaalselt unikaalne: kui sama seade logitakse teise kontoga
 * sisse, liigub token uue kasutaja alla, et teavitused ei läheks eelmisele
 * kasutajale.
 */
deviceTokensRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { token, platform } = registerSchema.parse(req.body);
    const userId = req.user!.sub;

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });

    res.status(204).end();
  })
);

const unregisterSchema = z.object({ token: z.string().min(1) });

/** Kustutab tokeni (väljalogimisel), et teavitused enam sellesse seadmesse ei läheks. */
deviceTokensRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    const { token } = unregisterSchema.parse(req.body);
    await prisma.deviceToken.deleteMany({ where: { token, userId: req.user!.sub } });
    res.status(204).end();
  })
);
