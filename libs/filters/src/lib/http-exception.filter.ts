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
  code?: string;
  details?: unknown;
  httpStatus?: number;
  [key: string]: unknown;
}

// Map your response codes to HTTP status
const httpStatusMap: Record<string, number> = {
  OK: HttpStatus.OK,                 // 200
  CREATED: HttpStatus.CREATED,       // 201
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  ALREADY_EXISTS: HttpStatus.CONFLICT,
};

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status: number;
    let message: string;
    let code: string;
    let details: unknown;

    // --- BaseResponseDto returned from service ---
    if (exception instanceof BaseResponseDto) {
      code = exception.code;
      status = httpStatusMap[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      details = exception.error ?? null;

      response.status(status).json(exception);
      return;
    }

    // --- HTTP exceptions ---
    if (exception instanceof HttpException) {
      const excResponse = exception.getResponse() as ExceptionResponse;
      status = exception.getStatus();
      message = Array.isArray(excResponse?.message)
        ? excResponse.message.join(', ')
        : excResponse?.message || (exception as Error)?.message || 'Error';
      code = excResponse?.code || String(status);
      details = excResponse?.details ?? excResponse ?? null;
    } 
    // --- Microservice RPC exceptions ---
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError() as ExceptionResponse;

      // Map RPC codes to HTTP status
      switch (rpcError?.code) {
        case 'USER_NOT_FOUND':
          status = HttpStatus.NOT_FOUND;
          break;
        case 'ALREADY_EXISTS':
          status = HttpStatus.CONFLICT;
          break;
        case 'KAFKA_EVENT_FAILED':
        case 'INTERNAL_ERROR':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        default:
          status = rpcError?.httpStatus ?? HttpStatus.BAD_REQUEST;
      }

      message = Array.isArray(rpcError?.message)
        ? rpcError.message.join(', ')
        : rpcError?.message || 'Internal server error';
      code = rpcError?.code || String(status);
      details = rpcError?.details ?? rpcError ?? null;
    } 
    // --- Unknown exceptions ---
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
