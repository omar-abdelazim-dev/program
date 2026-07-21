'use strict';

/**
 * @file config/database.js
 * @description MongoDB connection factory.
 *
 * This file is responsible ONLY for establishing and managing the
 * MongoDB connection. It imports config (which has already been
 * validated) and uses Mongoose to connect.
 *
 * USAGE
 * ──────
 *   const connectDB = require('./config/database');
 *   await connectDB();          // call once at app startup
 *
 * The function returns the Mongoose connection object so callers
 * can attach lifecycle hooks (e.g. on('error'), on('disconnected')).
 */

const mongoose = require('mongoose');
const config = require('./index');

/**
 * Connect to MongoDB using the validated URI from config.
 *
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(config.db.uri, config.db.options);

    console.info(
      `✔  MongoDB connected → ${conn.connection.host} [${config.app.env}]`
    );

    // ── Connection event hooks ────────────────────────────────────────────
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠  MongoDB disconnected. Attempting to reconnect…');
    });

    mongoose.connection.on('reconnected', () => {
      console.info('✔  MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('✖  MongoDB connection error:', err.message);
    });

    return conn.connection;
  } catch (err) {
    console.error(`✖  MongoDB connection failed: ${err.message}`);
    // Exit the process — the app should not run without a database.
    process.exit(1);
  }
}

module.exports = connectDB;
