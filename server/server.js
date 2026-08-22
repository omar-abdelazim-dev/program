import "dotenv/config";
import cron from "node-cron";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { validateEnvironment } from "./config/env.js";
import app from "./app.js";
import logger from "./utils/logger.js";
import {
  runOngoingInactivityCheck,
  runDraftExpirationCheck,
} from "./jobs/courseLifecycleJobs.js";

let httpServer;
let isShuttingDown = false;
const scheduledTasks = [];

let runtimeConfig;
try {
  runtimeConfig = validateEnvironment();
} catch (error) {
  console.error(`FATAL: ${error.message}`);
  process.exit(1);
}

const startServer = async () => {
  // Wait for the database connection before starting the HTTP server
  await connectDB();

  const PORT = runtimeConfig.port;
  httpServer = app.listen(PORT, () =>
    logger.info(`Server running on http://localhost:${PORT}`),
  );

  // Ongoing-course lifecycle: both jobs are idempotent (see
  // jobs/courseLifecycleJobs.js) so overlapping runs across a daily
  // schedule, or across multiple instances once this app is horizontally
  // scaled, are safe. Once-daily is frequent enough for day-granularity
  // deadlines (14-day inactivity, 90-day expiration) without needing a
  // dedicated worker process yet.
  scheduledTasks.push(cron.schedule("0 3 * * *", async () => {
    try {
      await runOngoingInactivityCheck();
    } catch (error) {
      logger.error("Ongoing inactivity check failed", {
        error: error.message,
        stack: error.stack,
      });
    }
  }));
  scheduledTasks.push(cron.schedule("15 3 * * *", async () => {
    try {
      await runDraftExpirationCheck();
    } catch (error) {
      logger.error("Draft expiration check failed", {
        error: error.message,
        stack: error.stack,
      });
    }
  }));
};

const shutdown = async (signal, error) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Graceful shutdown started', { signal });

  scheduledTasks.forEach((task) => task.stop());
  const forcedExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, 25_000);
  forcedExit.unref();

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((closeError) => (closeError ? reject(closeError) : resolve()));
      });
    }
    await mongoose.connection.close();
    clearTimeout(forcedExit);
    logger.info('Graceful shutdown complete', { signal });
    process.exit(0);
  } catch (shutdownError) {
    clearTimeout(forcedExit);
    logger.error('Graceful shutdown failed', {
      signal,
      error: shutdownError.message,
      originalError: error?.message,
    });
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', { error: error?.message, stack: error?.stack });
  shutdown('unhandledRejection', error);
});
process.once('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error?.message, stack: error?.stack });
  shutdown('uncaughtException', error);
});

startServer().catch((error) => {
  logger.error('Server startup failed', { error: error.message, stack: error.stack });
  process.exit(1);
});
