import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { HttpError } from "../middleware/errorHandler.js";

export const authRouter = Router();

// Kaitse jõhkra jõu rünnete eest sisselogimisel/registreerumisel.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Registreerimisel kehtiv, range vorming (kanooniline slug on alati väiketäht).
// Suurtähtede sisestus normaliseeritakse enne regex-kontrolli, mitte ei
// lükata tagasi — nii saab kasutaja kirjutada "TarMel-Ehitus" ja slug'iks
// saab ikkagi "tarmel-ehitus".
const orgSlugSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.toLowerCase() : v),
  z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Ettevõtte kood võib sisaldada ainult tähti, numbreid ja sidekriipse.")
);

// Sisselogimisel ei pea kasutaja sisestama slug'i täpselt sama juhtumiga,
// mis see loomisel salvestati — normaliseerime siin ainult võrdluseks,
// ilma vormingu regex-i peale sundimata.
const loginOrgSlugSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.toLowerCase() : v),
  z.string().min(1)
);

const loginSchema = z.object({
  orgSlug: loginOrgSlugSchema,
  username: z.string().min(1),
  password: z.string().min(1),
});

// Port: public/authenticate.php (+ ettevõtte-skoop multi-tenant arhitektuuris)
authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { orgSlug, username, password } = loginSchema.parse(req.body);

    // Sama üldine veateade nii vale org-koodi kui vale kasutajanime/parooli
    // korral, et mitte lekitada, millised ettevõtte koodid eksisteerivad.
    const invalidCredentials = () => new HttpError(401, "Vale ettevõtte kood, kasutajanimi või parool.");

    const organization = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!organization) throw invalidCredentials();

    // MySQL-i vaikimisi tähemärjastik (utf8mb4_unicode_ci) on juba
    // suur-/väiketähetundetu, seega vastab see päring nt "Admin" ja "ADMIN"
    // sõltumata sellest, mis juhtumiga kasutajanimi algselt loodi.
    const user = await prisma.user.findUnique({
      where: { organizationId_username: { organizationId: organization.id, username } },
    });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw invalidCredentials();
    }

    const payload = { sub: user.id, organizationId: user.organizationId, username: user.username, role: user.role };
    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, username: user.username, role: user.role },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
    });
  })
);

const registerOrgSchema = z.object({
  orgName: z.string().min(1).max(255),
  orgSlug: orgSlugSchema,
  adminUsername: z.string().min(1).max(255),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(1),
});

// Isetenindus-registreerumine: loob uue ettevõtte + esimese admin-kasutaja.
authRouter.post(
  "/register-organization",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { orgName, orgSlug, adminUsername, adminEmail, adminPassword } = registerOrgSchema.parse(req.body);

    const passwordError = validatePasswordPolicy(adminPassword);
    if (passwordError) throw new HttpError(400, passwordError);

    const existing = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (existing) throw new HttpError(409, "See ettevõtte kood on juba kasutusel.");

    const hashed = await hashPassword(adminPassword);

    const { organization, user } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: orgName, slug: orgSlug } });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          username: adminUsername,
          email: adminEmail,
          password: hashed,
          hourlyRate: 0,
          advance: 0,
          role: "admin",
        },
      });
      return { organization, user };
    });

    const payload = { sub: user.id, organizationId: user.organizationId, username: user.username, role: user.role };
    res.status(201).json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: { id: user.id, username: user.username, role: user.role },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
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
    const { sub, organizationId, username, role } = payload;
    res.json({ accessToken: signAccessToken({ sub, organizationId, username, role }) });
  })
);

// Stateless JWT — klient kustutab tokenid lokaalselt. Vt api/README.md
// "Teadaolevad lihtsustused" täieliku tokeni tühistamise kohta.
authRouter.post("/logout", (_req, res) => {
  res.status(204).end();
});
