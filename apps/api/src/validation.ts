import { ValidationPipe } from '@nestjs/common';

/**
 * whitelist + forbidNonWhitelisted reject unknown fields, which blocks mass assignment
 * (a client sending its own id or status). transform turns the JSON body into the DTO class.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
}
