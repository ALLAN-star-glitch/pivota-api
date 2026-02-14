import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Map your business strings to HTTP numbers
const HTTP_CODE_MAP: Record<string, number> = {
  OK: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
  ACCEPTED: HttpStatus.ACCEPTED,
  NO_CONTENT: HttpStatus.NO_CONTENT,
};

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response) => {
        // Only transform if it's our standard platform response
        if (response && typeof response === 'object' && 'success' in response) {
          const rawCode = String(response.code);
          const numericStatus = HTTP_CODE_MAP[rawCode] ?? (typeof response.code === 'number' ? response.code : HttpStatus.OK);

          return {
            ...response,
            code: numericStatus,
            status: rawCode, // Preserve the original string (e.g., "OK")
          };
        }
        return response;
      }),
    );
  }
}