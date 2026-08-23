import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { objectsRouter } from "./objects.routes.js";
import { timeLogsRouter } from "./timeLogs.routes.js";
import { usersRouter } from "./users.routes.js";
import { teamPerformanceRouter } from "./teamPerformance.routes.js";
import { settingsRouter } from "./settings.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/me", dashboardRouter);
apiRouter.use("/time-logs", timeLogsRouter);
apiRouter.use("/objects", objectsRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/team-performance", teamPerformanceRouter);
apiRouter.use("/settings", settingsRouter);
