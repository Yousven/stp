import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { hashPassword, validatePasswordPolicy } from "../utils/password.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

const userSelect = {
  id: true,
  username: true,
  email: true,
  hourlyRate: true,
  advance: true,
  role: true,
} satisfies Record<string, boolean>;

// Port: public/admin_users.php
usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user!.organizationId },
      select: userSelect,
      orderBy: { username: "asc" },
    });
    res.json(users);
  })
);

const createUserSchema = z.object({
  username: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(1),
  hourlyRate: z.number().nonnegative(),
  advance: z.number(),
  role: z.enum(["admin", "employee"]),
});

// Port: public/admin_add_user.php
usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const passwordError = validatePasswordPolicy(data.password);
    if (passwordError) throw new HttpError(400, passwordError);

    try {
      const user = await prisma.user.create({
        data: { ...data, password: await hashPassword(data.password), organizationId: req.user!.organizationId },
        select: userSelect,
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "Kasutajanimi või e-mail on selles ettevõttes juba kasutusel.");
      }
      throw err;
    }
  })
);

const updateUserSchema = z.object({
  username: z.string().min(1).max(255),
  email: z.string().email(),
  hourlyRate: z.number().nonnegative(),
  advance: z.number(),
  role: z.enum(["admin", "employee"]),
  password: z.string().min(1).optional(),
});

// Port: public/admin_edit_user.php (parool valikuline, nagu originaalis)
usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { password, ...data } = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({ where: { id, organizationId: req.user!.organizationId } });
    if (!existing) throw new HttpError(404, "Kasutajat ei leitud.");

    if (password) {
      const passwordError = validatePasswordPolicy(password);
      if (passwordError) throw new HttpError(400, passwordError);
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: { ...data, ...(password ? { password: await hashPassword(password) } : {}) },
        select: userSelect,
      });
      res.json(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new HttpError(409, "Kasutajanimi või e-mail on selles ettevõttes juba kasutusel.");
      }
      throw err;
    }
  })
);

// Port: public/admin_delete_user.php
usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findFirst({ where: { id, organizationId: req.user!.organizationId } });
    if (!existing) throw new HttpError(404, "Kasutajat ei leitud.");

    try {
      await prisma.user.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new HttpError(409, "Kasutajat ei saa kustutada, kuna tal on seotud töölogisid.");
      }
      throw err;
    }
  })
);
