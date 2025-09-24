import { ErrorPayload } from '@pivota-api/interfaces';

export class BaseResponseDto<T = unknown> {
  readonly success: boolean;      // true if operation succeeded
  readonly message: string;       // human-readable info
  readonly code: string;          // machine-readable status
  readonly data?: T;              // populated on success
  readonly error?: ErrorPayload;  // populated on failure

  private constructor(
    success: boolean,
    message: string,
    code: string,
    data?: T,
    error?: ErrorPayload
  ) {
    this.success = success;
    this.message = message;
    this.code = code;
    this.data = data;
    this.error = error;
  }

  // Success factory
  static ok<T>(data: T, message = 'Success', code = 'OK'): BaseResponseDto<T> {
    return new BaseResponseDto<T>(true, message, code, data);
  }

  // Failure factory
  static fail(message: string, code = 'INTERNAL_ERROR', details?: unknown): BaseResponseDto<null> {
    return new BaseResponseDto<null>(
      false,
      message,
      code,
      undefined,
      { message, code, details: details ?? null }
    );
  }
}
