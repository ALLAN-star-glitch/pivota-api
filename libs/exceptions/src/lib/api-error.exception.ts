import { HttpException } from '@nestjs/common';
import { BaseResponseDto } from '@pivota-api/dtos';


export class ApiErrorException extends HttpException {
  constructor(
    message: string,
    statusCode: number,
    details?: unknown,
  ) {
    super(
      BaseResponseDto.fail(message, String(statusCode), details),
      statusCode,
    );
  }
}
