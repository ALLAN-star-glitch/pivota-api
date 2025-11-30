import { ErrorPayload } from './error-payload.interface';

export interface BaseRoleIdGrpcResponse<T> {
  success: boolean;
  code: string;
  message: string;
  roleId?: T;
  error?: ErrorPayload | null;
}
