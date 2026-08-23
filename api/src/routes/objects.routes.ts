import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const objectsRouter = Router();
objectsRouter.use(requireAuth);

// Aktiivsete objektide nimekiri (tööpäeva alustamise objekti-valija jaoks).
// Täielik admin CRUD (lisa/muuda/deaktiveeri) tuleb Faas 3-s.
objectsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const objects = await prisma.workObject.findMany({
      where: { deleted: false },
      orderBy: { name: "asc" },
    });
    res.json(objects);
  })
);
