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
  code: string | number;
  status?: string;
  error?: {
    message: string;
    code: string | number;
    details?: unknown;
  };
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
  // Success
  OK: HttpStatus.OK,
  SUCCESS_EMPTY: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
  ACCEPTED: HttpStatus.ACCEPTED,
  
  // Client Errors (4xx)
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  INVALID_OTP: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ALREADY_EXISTS: HttpStatus.CONFLICT,
  CONFLICT: HttpStatus.CONFLICT,
  
  // Booking specific errors
  SERVICE_UNAVAILABLE: HttpStatus.BAD_REQUEST,
  CLIENT_NOT_FOUND: HttpStatus.NOT_FOUND,
  CONTRACTOR_NOT_FOUND: HttpStatus.NOT_FOUND,
  SELF_BOOKING_NOT_ALLOWED: HttpStatus.BAD_REQUEST,
  SERVICE_AREA_NOT_COVERED: HttpStatus.BAD_REQUEST,
  INVALID_DURATION_UNIT: HttpStatus.BAD_REQUEST,
  DURATION_REQUIRED: HttpStatus.BAD_REQUEST,
  DURATION_EXCEEDS_LIMIT: HttpStatus.BAD_REQUEST,
  DURATION_NOT_ALLOWED: HttpStatus.BAD_REQUEST,
  DAY_NOT_AVAILABLE: HttpStatus.BAD_REQUEST,
  DAY_CLOSED: HttpStatus.BAD_REQUEST,
  TIME_OUTSIDE_HOURS: HttpStatus.BAD_REQUEST,
  END_TIME_EXCEEDS_CLOSING: HttpStatus.BAD_REQUEST,
  CONFLICTING_BOOKING: HttpStatus.CONFLICT,
  INVALID_STATUS: HttpStatus.BAD_REQUEST,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  FETCH_ERROR: HttpStatus.BAD_REQUEST,
  
  // Invitation
  INVITATION_SENT: HttpStatus.CREATED,
  
  // Rate Limiting
  TOO_MANY_REQUESTS: HttpStatus.TOO_MANY_REQUESTS,
  
  // Payment
  PAYMENT_REQUIRED: HttpStatus.PAYMENT_REQUIRED,
  PAYMENT_SERVICE_OFFLINE: HttpStatus.OK,
  
  // Profile specific
  PROFILE_NOT_FOUND: HttpStatus.NOT_FOUND,
  
  // User specific
  USER_NOT_FOUND: HttpStatus.NOT_FOUND,
  CATEGORY_NOT_FOUND: HttpStatus.NOT_FOUND,
  ACCOUNT_MISMATCH: HttpStatus.FORBIDDEN,
  
  // Server Errors (5xx)
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  SERVICE_UNAVAILABLE_SERVER: HttpStatus.SERVICE_UNAVAILABLE,  // Renamed to avoid duplicate
  GATEWAY_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
};

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = null;

    // ---------------------------------------------------------
    // 1. Service already returned a BaseResponse-like object
    // ---------------------------------------------------------
    if (isBaseResponse(exception)) {
      const numericStatus = httpStatusMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

      const finalResponse: BaseResponseShape = {
        ...exception,
        code: numericStatus,
        status: String(exception.code),
        error: exception.error ? {
          ...(exception.error as { message: string; code: string | number; details?: unknown }),
          code: numericStatus
        } : undefined
      };

      response.status(numericStatus).json(finalResponse);
      return;
    }

    // ---------------------------------------------------------
    // 2. Handle ThrottlerException specifically
    // ---------------------------------------------------------
    if (
      typeof exception === 'object' && 
      exception !== null && 
      exception.constructor?.name === 'ThrottlerException'
    ) {
      return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 429,
        status: 'TOO_MANY_REQUESTS'
      });
    }

    // ---------------------------------------------------------
    // 3. HTTP Exceptions (REST layer)
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
    // 4. RPC Exceptions (gRPC / Kafka)
    // ---------------------------------------------------------
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError() as ExceptionResponse;
      const rpcCode = rpcError?.code || 'INTERNAL_ERROR';

      status = httpStatusMap[rpcCode] ?? HttpStatus.BAD_REQUEST;

      message = Array.isArray(rpcError?.message)
        ? rpcError.message.join(', ')
        : rpcError?.message ?? message;

      code = rpcCode;
      details = rpcError?.details ?? rpcError ?? null;
    }

    // ---------------------------------------------------------
    // 5. Unknown runtime errors
    // ---------------------------------------------------------
    else if (exception instanceof Error) {
      // Check for common error patterns
      if (exception.message.includes('ECONNREFUSED')) {
        message = 'Service communication failure. Please try again later.';
        code = 'SERVICE_UNAVAILABLE_SERVER';
        status = HttpStatus.SERVICE_UNAVAILABLE;
      } else if (exception.message.includes('Prisma')) {
        message = 'Database error occurred. Please try again.';
        code = 'DATABASE_ERROR';
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      } else {
        message = exception.message;
      }
      
      // Only show stack traces in development mode
      if (process.env['NODE_ENV'] === 'development') {
        details = exception.stack;
      }
    }

    // ---------------------------------------------------------
    // 6. Log the error for debugging
    // ---------------------------------------------------------
    if (status >= 500) {
      console.error(`[ERROR] ${request?.method || 'UNKNOWN'} ${request?.url || 'UNKNOWN'} - ${status}: ${message}`);
      if (details && process.env['NODE_ENV'] === 'development') {
        console.error(details);
      }
    }

    // ---------------------------------------------------------
    // 7. Send the final response
    // ---------------------------------------------------------
    response.status(status).json({
      success: false,
      message,
      code: status,
      status: code,
      error: details ? { message: String(details), code } : null,
    });
  }
}