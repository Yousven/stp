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

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
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
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/reports", reportsRouter);
