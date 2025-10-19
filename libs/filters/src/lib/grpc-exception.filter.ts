import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseResponseDto } from '@pivota-api/dtos';
import { ValidationError } from 'class-validator';

interface HttpErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  validationErrors?: ValidationError[];
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: string | string[] | ValidationError[] | null = null;

    // Handle HttpException (Nest built-ins, ValidationPipe, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as HttpErrorResponse;
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message || message;
        errorDetails = body.validationErrors || body.error || body.message || null;
      }
    }

    // Handle unexpected JS Errors
    else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = [exception.stack || 'No stack trace available'];
    }

    // Handle validation error arrays
    if (Array.isArray(errorDetails)) {
      errorDetails = errorDetails.map((err) => {
        if (typeof err === 'string') return err;
        if ('constraints' in err && err.constraints)
          return Object.values(err.constraints).join(', ');
        return '';
      });
    }
    

    // Build structured BaseResponseDto
    const payload = BaseResponseDto.fail(
      message,
      String(status),
      { error: errorDetails },
    );

    this.logger.error(`[${status}] ${message}`);

    response.status(status).json(payload);
  }
}
