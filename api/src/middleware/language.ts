import type { NextFunction, Request, Response } from "express";
import { messagesFor, pickLanguage, type Language, type Messages } from "../i18n/messages.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Kasutajale nähtavad teated tema keeles. */
      m: Messages;
      language: Language;
    }
  }
}

/**
 * Seob päringule keele. Peab olema mountitud enne kõiki marsruute, kuna
 * `req.m` on seal kasutusel ja puuduv väärtus annaks vea just veateate
 * koostamisel — kõige halvemal võimalikul hetkel.
 */
export function languageMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.language = pickLanguage(req.headers["accept-language"]);
  req.m = messagesFor(req.language);
  next();
}
