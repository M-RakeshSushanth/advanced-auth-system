import morgan from 'morgan';
import { RequestHandler } from 'express';
import { env } from '../../config/env.config';

export const requestLogger: RequestHandler = (req, res, next) => {
  if (env.NODE_ENV === 'test') {
    return next();
  }
  return morgan(':method :url :status :res[content-length] - :response-time ms')(req, res, next);
};
