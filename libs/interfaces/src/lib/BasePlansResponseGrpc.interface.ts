import { ErrorPayload } from "./error-payload.interface";

export class BasePlansResponseGrpc<T> {
  success!: boolean;
  message!: string;
  code!: string;
  plans!: T;
  error!: ErrorPayload;
}