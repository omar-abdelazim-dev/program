import "dotenv/config";
import cron from "node-cron";
import connectDB from "./config/db.js";
import app from "./app.js";
import logger from "./utils/logger.js";
import {
  runOngoingInactivityCheck,
  runDraftExpirationCheck,
} from "./jobs/courseLifecycleJobs.js";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}

const startServer = async () => {
  // Wait for the database connection before starting the HTTP server
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`),
  );

  // Ongoing-course lifecycle: both jobs are idempotent (see
  // jobs/courseLifecycleJobs.js) so overlapping runs across a daily
  // schedule, or across multiple instances once this app is horizontally
  // scaled, are safe. Once-daily is frequent enough for day-granularity
  // deadlines (14-day inactivity, 90-day expiration) without needing a
  // dedicated worker process yet.
  cron.schedule("0 3 * * *", async () => {
    try {
      await runOngoingInactivityCheck();
    } catch (error) {
      logger.error("Ongoing inactivity check failed", {
        error: error.message,
        stack: error.stack,
      });
    }
  });
  cron.schedule("15 3 * * *", async () => {
    try {
      await runDraftExpirationCheck();
    } catch (error) {
      logger.error("Draft expiration check failed", {
        error: error.message,
        stack: error.stack,
      });
    }
  });
};

startServer();
