import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { BaseResponseDto } from '@pivota-api/dtos';

interface ExceptionResponse {
  message?: string | string[];
  httpStatus?: number;
  code?: string;
  [key: string]: unknown;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status: number;
    let message: string;
    let code: string;
    let details: unknown;

    // HTTP exceptions
    if (exception instanceof HttpException) {
      const excResponse = exception.getResponse() as ExceptionResponse;
      status = exception.getStatus();

      message = Array.isArray(excResponse?.message)
        ? excResponse.message.join(', ')
        : excResponse?.message || (exception as Error)?.message || 'Error';

      code = excResponse?.code || String(status);
      details = excResponse ? excResponse['details'] ?? excResponse : null;
    }
    // Microservice RPC exceptions
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError() as ExceptionResponse;
      status = rpcError?.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR;

      message = Array.isArray(rpcError?.message)
        ? rpcError.message.join(', ')
        : rpcError?.message || 'Internal server error';

      code = rpcError?.code || String(status);
      details = rpcError ? rpcError['details'] ?? rpcError : null;
    }
    // Unknown exceptions
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = (exception as Error)?.message || 'Internal server error';
      code = 'INTERNAL_ERROR';
      details = exception ?? null;
    }

    response
      .status(status)
      .json(BaseResponseDto.fail(message, code, details));
  }
}
