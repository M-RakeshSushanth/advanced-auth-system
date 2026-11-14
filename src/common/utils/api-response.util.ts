import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from '../constants/http-status.constant';

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  errors?: any;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: Record<string, any>
  ): Response {
    const responsePayload: IApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta !== undefined && { meta }),
    };

    return res.status(statusCode).json(responsePayload);
  }

  static error(
    res: Response,
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: any
  ): Response {
    const responsePayload: IApiResponse = {
      success: false,
      message,
      ...(errors !== undefined && { errors }),
    };

    return res.status(statusCode).json(responsePayload);
  }
}
