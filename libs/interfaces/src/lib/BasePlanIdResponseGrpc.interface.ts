import { ErrorPayload } from "./error-payload.interface";

export interface BasePlanIdResponseGrpc<T> {
    success: boolean;
    code: string;
    message: string;
    planId?: T ;
    error?: ErrorPayload;
}