import { fieldErrors } from '../../shared/authSchemas.js';
import { AppError } from './errors.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return next(new AppError(400, 'VALIDATION_ERROR', fieldErrors(result.error)));
    req.validated = result.data;
    next();
  };
}
