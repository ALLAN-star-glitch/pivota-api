export interface ErrorPayload {
  message: string;
  code?: string | number;
  details?: unknown;
}
