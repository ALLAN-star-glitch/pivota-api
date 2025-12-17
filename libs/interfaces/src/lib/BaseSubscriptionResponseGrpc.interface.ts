import { ErrorPayload } from "./error-payload.interface";

export interface BaseSubscriptionResponseGrpc<T> {
    success: boolean;
    code: string;
    message: string;
    subscription?: T ;
    error?: ErrorPayload;
}