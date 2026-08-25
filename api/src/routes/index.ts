import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { objectsRouter } from "./objects.routes.js";
import { timeLogsRouter } from "./timeLogs.routes.js";
import { usersRouter } from "./users.routes.js";
import { teamPerformanceRouter } from "./teamPerformance.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { reportsRouter } from "./reports.routes.js";
import { deviceTokensRouter } from "./deviceTokens.routes.js";
import { passwordResetRouter } from "./passwordReset.routes.js";
import { absencesRouter } from "./absences.routes.js";
import { costCodesRouter } from "./costCodes.routes.js";
import { billingRouter } from "./billing.routes.js";
import { subscriptionRouter } from "./subscription.routes.js";

export const apiRouter = Router();

/**
 * Tervisekontroll + proksi-diagnostika.
 *
 * `clientIp` on see, mida server arvab kliendi IP-ks. Reverse proxy taga
 * on seda vaja kontrollida: kui siin paistab Cloudflare'i serva-IP oma
 * asemel, on TRUST_PROXY_HOPS vale ja sisselogimise piirang loeb kõiki
 * kasutajaid üheks. Kliendile näidatakse ainult tema enda IP-d, seega
 * midagi ei lekitata.
 */
apiRouter.get("/health", (req, res) =>
  res.json({ status: "ok", clientIp: req.ip, forwardedFor: req.headers["x-forwarded-for"] ?? null })
);
apiRouter.use("/auth", passwordResetRouter);
apiRouter.use("/auth", authRouter);
// Täpsem tee peab olema enne üldisemat "/me"-d, muidu püüaks dashboardRouter
// selle enne kinni.
apiRouter.use("/me/device-tokens", deviceTokensRouter);
apiRouter.use("/me", dashboardRouter);
apiRouter.use("/time-logs", timeLogsRouter);
apiRouter.use("/objects", objectsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/team-performance", teamPerformanceRouter);
apiRouter.use("/absences", absencesRouter);
apiRouter.use("/cost-codes", costCodesRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/subscription", subscriptionRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/reports", reportsRouter);
