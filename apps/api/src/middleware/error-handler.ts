import { Request, Response, NextFunction } from 'express';
import { isAppError, formatErrorResponse } from '@pravado/utils';
import { logger } from '../lib/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({
    err: error,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  if (isAppError(error)) {
    return res.status(error.statusCode).json(formatErrorResponse(error));
  }

  const statusCode = 500;
  const response = formatErrorResponse(error);

  if (process.env.NODE_ENV === 'production') {
    delete (response.error as { stack?: string }).stack;
  }

  return res.status(statusCode).json(response);
};
