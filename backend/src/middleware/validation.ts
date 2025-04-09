import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, ValidationError } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      status: 'error',
      errors: errors.array().map((err: ValidationError) => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  };
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized access'
    });
  }

  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};