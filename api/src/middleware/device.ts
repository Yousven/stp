import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Seadme paigalduse püsiv id (`X-Device-Id`).
       *
       * Ei ole autentimisvahend — kliendi saadetud väärtust saab võltsida.
       * Ta on TUVASTUS, mille abil näeb, kas ühe tööpäeva sündmused tulevad
       * kogu aeg samast seadmest. Kellegi teise kontoga sisse logimine
       * teises telefonis annab teise id ja jätab jälje; see ei takista
       * midagi, aga teeb mustri nähtavaks.
       */
      deviceId?: string;
    }
  }
}

/** Lubatud märgid: äpp genereerib UUID-i, aga ära usu kliendi sisendit. */
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function readDeviceId(req: Request, _res: Response, next: NextFunction) {
  const raw = req.headers["x-device-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  req.deviceId = value && DEVICE_ID_PATTERN.test(value) ? value : undefined;
  next();
}
