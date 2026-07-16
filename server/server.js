import 'dotenv/config';
import connectDB from './config/db.js';
import app from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const startServer = async () => {
  // Wait for the database connection before starting the HTTP server
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
};

startServer();
