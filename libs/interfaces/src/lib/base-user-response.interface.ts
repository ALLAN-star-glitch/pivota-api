// Generic BaseResponse from gRPC

import { ErrorPayload } from "./error-payload.interface";

export interface BaseUserResponseGrpc<T> {
  success: boolean;
  message: string;
  code: string;
  user?: T;
  error?: ErrorPayload;
}