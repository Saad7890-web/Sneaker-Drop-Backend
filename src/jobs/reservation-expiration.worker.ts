import logger from "../config/logger";
import {
  broadcastReservationExpired,
  broadcastStockUpdated,
} from "../realtime/broadcaster";
import { expireDueReservationsBatch } from "../services/reservation-expiration.service";

const SWEEP_INTERVAL_MS = 5_000;
const BATCH_SIZE = 100;

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;

const runSweep = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const expiredEvents = await expireDueReservationsBatch(BATCH_SIZE);

    if (expiredEvents.length === 0) {
      return;
    }

    for (const event of expiredEvents) {
      broadcastReservationExpired(event);

      broadcastStockUpdated({
        dropId: event.dropId,
        availableStock: event.availableStock,
        status: event.status,
      });
    }

    logger.info(
      { expiredReservations: expiredEvents.length },
      "Expired reservations processed",
    );
  } catch (error) {
    logger.error({ error }, "Reservation expiration worker failed");
  } finally {
    isRunning = false;
  }
};

export const startReservationExpirationWorker = () => {
  void runSweep();

  intervalHandle = setInterval(() => {
    void runSweep();
  }, SWEEP_INTERVAL_MS);

  return () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  };
};
