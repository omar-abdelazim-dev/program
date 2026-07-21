'use strict';

/**
 * @file models/RefreshToken.js
 * Persisted refresh token record.
 * Enables server-side revocation (logout, suspicious activity).
 * Stores the jti (JWT ID) claim — NOT the raw token.
 *
 * Sprint 2 additions:
 *  - familyId: tracks token rotation lineage (reuse detection)
 *  - consumed: marks a token as rotated (not revoked, but replaced)
 */

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index — auto-deletes expired docs
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },

    // Sprint 2 — Token rotation lineage
    // familyId is set to the jti of the first token in a refresh chain.
    // When a token is rotated, the new token inherits the same familyId.
    // If a revoked token's familyId is presented, the entire family is revoked.
    familyId: { type: String, default: null, index: true },

    // consumed: true when this token has been rotated (superseded by a new one)
    // A consumed token that is presented again indicates a replay attack.
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, revoked: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
