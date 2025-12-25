import { ErrorPayload } from "./error-payload.interface";

export interface BaseTokenResponseGrpc<T> {
    success: boolean;
    message: string;
    code: string;
    tokens: T;
    error?: ErrorPayload | null;
}