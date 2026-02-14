import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { ErrorPayload } from '@pivota-api/interfaces';

@ApiExtraModels() // Tell Swagger to inspect nested generic types
export class BaseResponseDto<T = unknown> {
  status(status: any) {
    throw new Error('Method not implemented.');
  }
  @ApiProperty({ example: true, description: 'True if operation succeeded' })
  readonly success: boolean;

  @ApiProperty({ example: 'Success', description: 'Human-readable message' })
  readonly message: string;

  @ApiProperty({ example: 'OK', description: 'Machine-readable status code' })
  readonly code: string;

  @ApiProperty({
    description: 'Response data (populated on success)',
    required: false,
    type: Object, // Default to Object; for controllers we can override with T
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
  static fail(
    message: string,
    code = 'INTERNAL_ERROR',
    details?: unknown
  ): BaseResponseDto<null> {
    return new BaseResponseDto<null>(
      false,
      message,
      code,
      undefined,
      { message, code, details: details ?? null }
    );
  }
}
