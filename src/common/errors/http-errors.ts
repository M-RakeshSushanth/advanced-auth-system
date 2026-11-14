import { AppError } from './app.error';
import { HttpStatus } from '../constants/http-status.constant';

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors?: any) {
    super(message, HttpStatus.BAD_REQUEST, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', errors?: any) {
    super(message, HttpStatus.UNAUTHORIZED, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden: Insufficient permissions', errors?: any) {
    super(message, HttpStatus.FORBIDDEN, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors?: any) {
    super(message, HttpStatus.NOT_FOUND, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors?: any) {
    super(message, HttpStatus.CONFLICT, errors);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', errors?: any) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, errors);
  }
}
