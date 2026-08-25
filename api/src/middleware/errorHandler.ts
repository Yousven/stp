import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { captureError } from "../observability.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    // Zodi enda väljateated jäävad eesti keelde: need on skeemides
    // staatilised ja neid näeb ainult vigase päringu korral, mida äpp ise
    // ei tekita. Ümbritsev teade on tõlgitud.
    res.status(400).json({ error: req.m?.invalidInput ?? "Sisendandmed on vigased.", details: err.flatten() });
    return;
  }
  // HttpError on tahtlik, oodatud vastus (nt "objektist liiga kaugel") —
  // seda ei raporteerita veana, muidu upuks Sentry tavakäitumise sisse.
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  captureError(err, {
    method: req.method,
    path: req.path,
    userId: req.user?.sub,
    organizationId: req.user?.organizationId,
  });
  res.status(500).json({ error: req.m?.serverError ?? "Serveri viga." });
}
