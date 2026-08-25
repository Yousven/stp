import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { hashPassword, validatePasswordPolicy } from "../utils/password.js";
import { revokeUserTokens } from "../utils/revocation.js";
import { sendEmail } from "../notifications/email.js";
import { env } from "../env.js";

export const passwordResetRouter = Router();

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 tund, nagu originaalis

const requestSchema = z.object({
  orgSlug: z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.string().min(1)),
  email: z.string().email(),
});

/**
 * Parooli taastamise päring. Port: public/forgot_password.php
 *
 * Vastus on ALATI sama, olenemata sellest, kas selline kasutaja eksisteerib —
 * originaal ütles "Selle e-mailiga kasutajat ei leitud", mis lubab võõral
 * kontrollida, kes ettevõttes töötab.
 */
passwordResetRouter.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { orgSlug, email } = requestSchema.parse(req.body);

    const genericResponse = {
      message: "Kui selline konto on olemas, saatsime taastamise juhised e-postile.",
    };

    const organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) {
      res.json(genericResponse);
      return;
    }

    const user = await prisma.user.findFirst({
      where: { organizationId: organization.id, email, status: "active" },
    });
    if (!user) {
      res.json(genericResponse);
      return;
    }

    // Krüptograafiliselt juhuslik token; andmebaasis hoiame seda kujul,
    // millega saab võrrelda, aga mis pole äraarvatav.
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const link = `${env.appUrl}/reset-password?token=${token}`;
    await sendEmail(
      user.email,
      "Parooli taastamine — SmartTimePlanning",
      `Tere ${user.username},\n\n` +
        "Sinu kontole küsiti parooli taastamist. Uue parooli seadmiseks ava see link:\n\n" +
        `${link}\n\n` +
        "Link kehtib ühe tunni jooksul ja seda saab kasutada ainult korra.\n\n" +
        "Kui sina seda ei küsinud, võid selle kirja tähelepanuta jätta — parool jääb samaks.\n\n" +
        "SmartTimePlanning"
    );

    res.json(genericResponse);
  })
);

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Uue parooli seadmine. Port: public/reset_password.php
 *
 * Originaal kustutas tokeni pärast kasutamist; siin märgime selle
 * kasutatuks (`usedAt`), et jääks jälg. Lisaks tühistatakse kõik senised
 * sessioonid — kui parooli lähtestamise põhjus oli konto ülevõtmine, ei
 * tohi ründaja vana tokeniga edasi töötada.
 */
passwordResetRouter.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = resetSchema.parse(req.body);

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) throw new HttpError(400, passwordError);

    const reset = await prisma.passwordReset.findUnique({ where: { token }, include: { user: true } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new HttpError(400, "Link on aegunud või juba kasutatud. Palun küsi uus taastamise link.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: await hashPassword(password) } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      // Kõik sama kasutaja varasemad kasutamata lingid kaotavad kehtivuse.
      prisma.passwordReset.updateMany({
        where: { userId: reset.userId, usedAt: null, id: { not: reset.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    await revokeUserTokens(reset.userId, "parooli lähtestamine");

    res.json({ message: "Parool on uuendatud. Saad nüüd uue parooliga sisse logida." });
  })
);
