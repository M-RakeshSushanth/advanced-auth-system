import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';
import { HttpStatus } from '../constants/http-status.constant';
import { ApiResponse } from '../utils/api-response.util';
import { env } from '../../config/env.config';
import { logger } from '../../config/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || undefined;

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = HttpStatus.CONFLICT;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Please use another value.`;
    errors = [{ field, message }];
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = HttpStatus.BAD_REQUEST;
    message = `Invalid format for resource identifier: ${err.value}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle JWT errors if thrown directly by library
  if (err.name === 'JsonWebTokenError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = 'Authentication token has expired';
  }

  // Log error details for server logs
  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
  } else {
    logger.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  // Do not expose stack traces or internal errors in production
  if (env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Internal server error';
    errors = undefined;
  }

  ApiResponse.error(res, message, statusCode, errors);
};
