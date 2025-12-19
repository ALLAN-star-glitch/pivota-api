import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Generic response shape used across the platform
 * (DO NOT import DTOs in filters)
 */
interface BaseResponseShape {
  success: boolean;
  message: string;
  code: string;
  error?: unknown;
  [key: string]: unknown;
}

interface ExceptionResponse {
  message?: string | string[];
  code?: string;
  details?: unknown;
  httpStatus?: number;
}

/**
 * Type guard for platform response objects
 */
function isBaseResponse(obj: unknown): obj is BaseResponseShape {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'message' in obj &&
    'code' in obj
  );
}

// Map internal codes → HTTP status
const httpStatusMap: Record<string, number> = {
  OK: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = null;

    // ---------------------------------------------------------
    // 1. Service already returned a BaseResponse-like object
    // ---------------------------------------------------------
    if (isBaseResponse(exception)) {
      status =
        httpStatusMap[exception.code] ??
        HttpStatus.INTERNAL_SERVER_ERROR;

      response.status(status).json(exception);
      return;
    }

    // ---------------------------------------------------------
    // 2. HTTP Exceptions (REST layer)
    // ---------------------------------------------------------
    if (exception instanceof HttpException) {
      const excResponse = exception.getResponse() as ExceptionResponse;

      status = exception.getStatus();
      message = Array.isArray(excResponse?.message)
        ? excResponse.message.join(', ')
        : excResponse?.message ?? exception.message;

      code = excResponse?.code ?? String(status);
      details = excResponse?.details ?? excResponse ?? null;
    }

    // ---------------------------------------------------------
    // 3. RPC Exceptions (gRPC / Kafka)
    // ---------------------------------------------------------
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError() as ExceptionResponse;

      switch (rpcError?.code) {
        case 'USER_NOT_FOUND':
          status = HttpStatus.NOT_FOUND;
          break;
        case 'ALREADY_EXISTS':
          status = HttpStatus.CONFLICT;
          break;
        case 'INTERNAL_ERROR':
        case 'KAFKA_EVENT_FAILED':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          break;
        default:
          status = rpcError?.httpStatus ?? HttpStatus.BAD_REQUEST;
      }

      message = Array.isArray(rpcError?.message)
        ? rpcError.message.join(', ')
        : rpcError?.message ?? message;

      code = rpcError?.code ?? code;
      details = rpcError?.details ?? rpcError ?? null;
    }

    // ---------------------------------------------------------
    // 4. Unknown runtime errors
    // ---------------------------------------------------------
    else if (exception instanceof Error) {
      message = exception.message;
      details = exception.stack;
    }

    response.status(status).json({
      success: false,
      message,
      code,
      error: details,
    });
  }
}
