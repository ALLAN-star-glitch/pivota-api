// Generic BaseResponse from gRPC

export interface BaseUserResponseGrpc<T> {
  success: boolean;
  message: string;
  code: string;
  user?: T;
  error?: string;
}