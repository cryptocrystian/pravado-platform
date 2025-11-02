import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@pravado/utils';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {} as Record<string, string>);

      return next(new ValidationError('Validation failed', { errors: details }));
    }

    req.body = value;
    next();
  };
};
