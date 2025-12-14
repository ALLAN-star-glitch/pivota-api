import { ErrorPayload } from "./error-payload.interface";

export class BasePlanResponseGrpc<T> {
  success!: boolean;
  message!: string;
  code!: string;
  plan!: T;
  error!: ErrorPayload;
}