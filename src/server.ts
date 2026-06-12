import http from "http";

import app from "./app";
import { env } from "./config/env";
import logger from "./config/logger";
import { startReservationExpirationWorker } from "./jobs/reservation-expiration.worker";
import { initSocket } from "./socket";

const server = http.createServer(app);

initSocket(server);

const stopWorker = startReservationExpirationWorker();

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down gracefully");

  stopWorker();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
    },
    "Server started successfully",
  );
});
