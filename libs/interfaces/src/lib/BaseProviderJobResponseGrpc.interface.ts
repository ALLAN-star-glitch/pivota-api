import { ErrorPayload } from "./error-payload.interface";

export interface BaseProviderJobResponseGrpc<T> {
    
    success: boolean;
    message: string;
    code: string;
    providerJob: T;
    error: ErrorPayload

}
