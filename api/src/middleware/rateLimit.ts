import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { verifyAccessToken } from "../utils/tokens.js";

/**
 * Piiramine kasutaja kaupa, mitte IP kaupa: terve ehitusbrigaad võib olla
 * sama mobiiliopraatori NAT-i taga, seega IP-põhine limiit lööks nad kõik
 * korraga välja.
 *
 * Token loetakse siin ise päisest, mitte `req.user`-ist: üldine limiter
 * jookseb enne `requireAuth`-i, seega `req.user` ei ole veel määratud.
 * Vigase/puuduva tokeni korral langeme IP peale.
 */
function keyByUserOrIp(req: Request): string {
  const header = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : queryToken;

  if (token) {
    try {
      return `user:${verifyAccessToken(token).sub}`;
    } catch {
      // Vigane token — kohtle anonüümsena.
    }
  }
  return `ip:${req.ip}`;
}

/** Sisselogimine ja registreerimine — jõhkra jõu vastu, IP kaupa. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Üldine limiit kõigile autenditud endpointidele. Piisavalt lai, et päris
 * kasutamist mitte segada (dashboard + ajalugu + objektid iga avamisega),
 * aga peatab skriptitud pommitamise.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Liiga palju päringuid. Palun oota hetk ja proovi uuesti." },
});

/**
 * Kitsam limiit kallitele operatsioonidele (Excel/PDF genereerimine käib
 * läbi kogu töölogide hulga ja võib CPU-d koormata).
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Liiga palju raporti päringuid. Palun oota hetk." },
});

/**
 * Kohaloleku sündmuste vastuvõtt: natiivne järjekord võib saata mitu partiid
 * järjest, seega lubame rohkem kui tavaline API-limiit.
 */
export const presenceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
});
