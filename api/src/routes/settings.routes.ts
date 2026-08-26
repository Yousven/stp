import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireAdmin);

const DEFAULTS: Record<string, string> = {
  check_in_deadline: "09:00:00",
  check_out_deadline: "18:00:00",
  tolerance: "5",
  admin_email: "admin@example.com",
  // Ületunnid: kumbki reegel saab olla eraldi väljas ("0"), kuna
  // ettevõtted lepivad erinevalt kokku. TÖS § 44 kordaja on 1,5.
  overtime_daily_threshold: "8",
  overtime_weekly_threshold: "40",
  overtime_multiplier: "1.5",
};

// Port: public/admin_settings.php (GET osa)
settingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await prisma.setting.findMany({ where: { organizationId: req.user!.organizationId } });
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ ...DEFAULTS, ...stored });
  })
);

const numericString = (max: number) =>
  z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= max, {
      message: `Väärtus peab olema arv vahemikus 0-${max}`,
    });

const settingsSchema = z.object({
  check_in_deadline: z.string().min(1),
  check_out_deadline: z.string().min(1),
  tolerance: z.string().min(1),
  admin_email: z.string().email(),
  overtime_daily_threshold: numericString(24).optional(),
  overtime_weekly_threshold: numericString(168).optional(),
  overtime_multiplier: numericString(5).optional(),
});

// Port: public/admin_settings.php (POST/REPLACE osa)
settingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const data = settingsSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    await prisma.$transaction(
      Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { organizationId_key: { organizationId, key } },
          update: { value },
          create: { organizationId, key, value },
        })
      )
    );

    res.json(data);
  })
);

/**
 * Arve väljastaja rekvisiidid.
 *
 * Hoitakse `organizations` tabelis, mitte võti-väärtus seadetes: need on
 * kindla kujuga väljad, mis trükitakse igale arvele, ja neid loeb ka
 * arve koostamine. Vabatekstiline seadete tabel laseks siia sattuda
 * kirjavigadega võtmeid, mida keegi ei märkaks enne, kui arve on väljas.
 */
settingsRouter.get(
  "/company",
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: req.user!.organizationId },
      select: {
        name: true,
        registryCode: true,
        vatNumber: true,
        address: true,
        email: true,
        phone: true,
        iban: true,
        defaultVatRate: true,
      },
    });
    res.json(org);
  })
);

const companySchema = z.object({
  name: z.string().min(1).max(255),
  registryCode: z.string().max(40).nullable().optional(),
  vatNumber: z.string().max(40).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  iban: z.string().max(64).nullable().optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
});

settingsRouter.put(
  "/company",
  asyncHandler(async (req, res) => {
    const data = companySchema.parse(req.body);
    const updated = await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: {
        name: data.name,
        registryCode: data.registryCode || null,
        vatNumber: data.vatNumber || null,
        address: data.address || null,
        email: data.email || null,
        phone: data.phone || null,
        iban: data.iban || null,
        ...(data.defaultVatRate === undefined ? {} : { defaultVatRate: data.defaultVatRate }),
      },
      select: {
        name: true,
        registryCode: true,
        vatNumber: true,
        address: true,
        email: true,
        phone: true,
        iban: true,
        defaultVatRate: true,
      },
    });
    res.json(updated);
  })
);
