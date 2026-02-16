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
  code: string | number; // Allow numeric HTTP codes or string business codes
  status?: string;       // To hold the string version (e.g., "NOT_FOUND")
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
  OK: HttpStatus.OK,
  SUCCESS_EMPTY: HttpStatus.OK, // Map this to 200 so the frontend gets an empty array gracefully
  CREATED: HttpStatus.CREATED,
  ACCEPTED: HttpStatus.ACCEPTED,
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  INVALID_OTP: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ALREADY_EXISTS: HttpStatus.CONFLICT,
  CONFLICT: HttpStatus.CONFLICT,
  
  
  // --- Rate Limiting ---
  TOO_MANY_REQUESTS: HttpStatus.TOO_MANY_REQUESTS, // 429
  

  // --- Payment / Premium Branch ---
  PAYMENT_REQUIRED: HttpStatus.PAYMENT_REQUIRED, // 402
  PAYMENT_SERVICE_OFFLINE: HttpStatus.OK, 
  
  // --- Server Errors ---
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,

  USER_NOT_FOUND: HttpStatus.NOT_FOUND,      // 404
  CATEGORY_NOT_FOUND: HttpStatus.NOT_FOUND,  // 404
  ACCOUNT_MISMATCH: HttpStatus.FORBIDDEN,    // 403
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
      const numericStatus = httpStatusMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

      const finalResponse: BaseResponseShape = {
        ...exception,
        code: numericStatus,         
        status: String(exception.code), 
        error: exception.error ? {
          ... (exception.error as { message: string; code: string | number; details?: unknown } ),
          code: numericStatus        
        } : undefined
      };

      response.status(numericStatus).json(finalResponse);
      return;
    }

    // ---------------------------------------------------------
    // NEW: Handle ThrottlerException specifically
    // ---------------------------------------------------------
   if (
      typeof exception === 'object' && 
      exception !== null && 
      exception.constructor.name === 'ThrottlerException'
    ) {
      return response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Security lockout: Multiple requests detected. Please wait 60 seconds.',
        code: 429,
        status: 'TOO_MANY_REQUESTS'
      });
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
      const rpcCode = rpcError?.code || 'INTERNAL_ERROR';

      status = httpStatusMap[rpcCode] ?? HttpStatus.BAD_REQUEST;

      message = Array.isArray(rpcError?.message)
        ? rpcError.message.join(', ')
        : rpcError?.message ?? message;

      code = rpcCode;
      details = rpcError?.details ?? rpcError ?? null;
    }

    // ---------------------------------------------------------
    // 4. Unknown runtime errors
    // ---------------------------------------------------------
    else if (exception instanceof Error) {
        message = exception.message.includes('ECONNREFUSED') 
          ? 'Service communication failure. Please try again later.' 
          : exception.message;
        
        // Only show stack traces in development mode
        details = process.env['NODE_ENV'] === 'development' ? exception.stack : null;
      }

    response.status(status).json({
      success: false,
      message,
      code: status, 
      status: code, 
      error: details,
    });
  }
}