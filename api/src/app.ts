import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { languageMiddleware } from "./middleware/language.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";
import { stripeWebhookRouter } from "./routes/stripeWebhook.routes.js";

export function createApp() {
  const app = express();

  // Reverse proxy taga on req.ip muidu alati proxy oma, mis lõhuks nii
  // rate-limiti kui logid. Hüpete arv sõltub sellest, kas ees on ainult
  // Caddy või ka Cloudflare — vt env.trustProxyHops.
  app.set("trust proxy", env.trustProxyHops);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
    })
  );
  // Stripe'i webhook vajab töötlemata keha allkirja kontrolliks, seega
  // peab olema ENNE express.json()-i.
  app.use("/api/stripe/webhook", stripeWebhookRouter);

  // Enne marsruute, et iga veateade oskaks kasutaja keelt.
  app.use(languageMiddleware);

  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  // Üldine limiit kogu API peale. Rangemad limiidid (login, raportid)
  // rakenduvad lisaks marsruutide sees.
  app.use("/api", apiLimiter, apiRouter);

  app.use(errorHandler);

  return app;
}
