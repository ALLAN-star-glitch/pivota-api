import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseResponseDto } from '@pivota-api/dtos';

interface ExceptionResponse {
  message?: string | string[];
  [key: string]: unknown;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: ExceptionResponse | null = isHttpException
      ? (exception.getResponse() as ExceptionResponse)
      : null;

    const message =
      (Array.isArray(exceptionResponse?.message)
        ? exceptionResponse?.message.join(', ')
        : exceptionResponse?.message) ||
      (exception as Error)?.message ||
      'Internal server error';

    const details =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? exceptionResponse
        : null;

    response
      .status(status)
      .json(BaseResponseDto.fail(message, String(status), details));
  }
}


