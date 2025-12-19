import { ErrorPayload } from "./error-payload.interface";

export interface BaseSubscriptionsResponseGrpc<T> {
    success: boolean;
    code: string;
    message: string;
    subscriptions?: T ;
    error?: ErrorPayload;
}