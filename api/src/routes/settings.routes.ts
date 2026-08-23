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

const settingsSchema = z.object({
  check_in_deadline: z.string().min(1),
  check_out_deadline: z.string().min(1),
  tolerance: z.string().min(1),
  admin_email: z.string().email(),
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
