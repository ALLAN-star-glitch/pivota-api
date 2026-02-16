import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { ErrorPayload } from '@pivota-api/interfaces';

@ApiExtraModels()
export class BaseResponseDto<T = unknown> {
  status(status: any) {
    throw new Error('Method not implemented.');
  }
  @ApiProperty({ example: true, description: 'True if operation succeeded' })
  readonly success: boolean;

  @ApiProperty({ example: 'Success', description: 'Human-readable message' })
  readonly message: string;

  @ApiProperty({ 
    example: 'OK', 
    description: 'Machine-readable status code (String internally, Number at Gateway)',
    oneOf: [{ type: 'string' }, { type: 'number' }] 
  })
  readonly code: string | number;

  @ApiProperty({
    description: 'Response data (populated on success)',
    required: false,
    type: Object,
  })
  readonly data?: T;

  @ApiProperty({
    description: 'Error payload (populated on failure)',
    required: false,
    type: Object,
    example: { message: 'Something went wrong', code: 'INTERNAL_ERROR', details: null },
  })
  readonly error?: ErrorPayload;

  private constructor(
    success: boolean,
    message: string,
    code: string | number,
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
  static ok<T>(data: T, message = 'Success', code: string | number = 'OK'): BaseResponseDto<T> {
    return new BaseResponseDto<T>(true, message, code, data);
  }

  // Failure factory
  static fail(
    message: string,
    code: string | number = 'INTERNAL_ERROR',
    details?: unknown
  ): BaseResponseDto<null> {
    return new BaseResponseDto<null>(
      false,
      message,
      code,
      null, // Use null instead of undefined for consistent JSON output
      // Only create the error object if there are actual extra details
      details ? { message, code, details } : undefined
    );
  }
}