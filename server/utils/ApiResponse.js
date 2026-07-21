'use strict';

/**
 * @file utils/ApiResponse.js
 * Standardised JSON response envelope used by all controllers.
 * Ensures a consistent shape across every API endpoint.
 */

class ApiResponse {
  /**
   * @param {number} statusCode
   * @param {*}      data
   * @param {string} message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Send this response via an Express res object.
   * @param {import('express').Response} res
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
