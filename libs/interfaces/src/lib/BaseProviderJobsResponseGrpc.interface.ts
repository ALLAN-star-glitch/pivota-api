import { ErrorPayload } from "./error-payload.interface";

export interface BaseProviderJobsResponseGrpc<T> {
    
    success: boolean;
    message: string;
    code: string;
    providerJobs: T;
    error: ErrorPayload

}
