import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { languageMiddleware } from "./middleware/language.js";
import { readDeviceId } from "./middleware/device.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";
import { stripeWebhookRouter } from "./routes/stripeWebhook.routes.js";

export function createApp() {
  const app = express();

  // Reverse proxy taga on req.ip muidu alati proxy oma, mis lõhuks nii
  // rate-limiti kui logid. Hüpete arv sõltub sellest, kas ees on ainult
  // Caddy või ka Cloudflare — vt env.trustProxyHops.
  app.set("trust proxy", env.trustProxyHops);

  /**
   * Sisu turvapoliitika.
   *
   * Vaikimisi helmet lubaks pildid ja päringud ainult omalt domeenilt, mis
   * lõhuks objekti kaardi (OpenStreetMapi kaardiruudud) ja aadressiotsingu
   * (Nominatim) — mõlemad on desktop-liidese objektivormi osa. Lubame
   * täpselt need kaks hosti, mitte kogu internetti.
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "https://*.tile.openstreetmap.org"],
          "connect-src": ["'self'", "https://nominatim.openstreetmap.org"],
        },
      },
    })
  );
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      // `X-Device-Id` on omapäis, seega brauser küsib selle jaoks eraldi
      // luba (preflight). Ilma selleta lakkaks arvutiliides töötamast.
      allowedHeaders: ["Content-Type", "Authorization", "Accept-Language", "X-Device-Id"],
    })
  );
  // Stripe'i webhook vajab töötlemata keha allkirja kontrolliks, seega
  // peab olema ENNE express.json()-i.
  app.use("/api/stripe/webhook", stripeWebhookRouter);

  // Enne marsruute, et iga veateade oskaks kasutaja keelt.
  app.use(languageMiddleware);
  // Seadme tuvastus (`X-Device-Id`) — vt middleware/device.ts.
  app.use(readDeviceId);

  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  // Üldine limiit kogu API peale. Rangemad limiidid (login, raportid)
  // rakenduvad lisaks marsruutide sees.
  app.use("/api", apiLimiter, apiRouter);

  /**
   * Desktop-liides.
   *
   * Sama React-rakendus, mis läheb Capacitoriga telefoni, serveeritakse
   * siit ka brauserile — juhataja ja raamatupidaja teevad tööd arvutist.
   * Eraldi hostimist ei ole: tunnel osutab niikuinii siia konteinerisse ja
   * sama päritolu tähendab, et CORS-i pole vaja.
   *
   * Kaust puudub kohalikus arenduses (seal jookseb Vite eraldi pordil),
   * seega serveerime ainult siis, kui build on olemas.
   */
  const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "web");
  if (existsSync(webRoot)) {
    // Hashitud varad võivad kaua vahemälus olla; index.html mitte, muidu
    // jääks brauserisse vana versioon pärast deploy'd.
    app.use(express.static(webRoot, { index: false, maxAge: "1y" }));

    app.all(/^(?!\/api\/).*/, (req, res, next) => {
      // Ainult lehepäringud saavad SPA-vastuse; puuduv fail peab jääma
      // 404-ks, et vigane varaviide ei paistaks töötava lehena.
      //
      // HEAD käib GET-iga kaasa, sest sellega kontrollivad saidi elusolekut
      // seireteenused ja proksid — HEAD-i peale 404 jätaks mulje, et leht
      // on maas.
      if ((req.method !== "GET" && req.method !== "HEAD") || path.extname(req.path) !== "") return next();
      res.sendFile(path.join(webRoot, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
