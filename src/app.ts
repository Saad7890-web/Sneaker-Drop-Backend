import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import logger from "./config/logger";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { apiLimiter } from "./middlewares/rateLimit.middleware";
import apiV1Router from "./routes";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
  }),
);

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Sneaker Drop API is running",
  });
});

app.use("/api/v1", apiLimiter, apiV1Router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
