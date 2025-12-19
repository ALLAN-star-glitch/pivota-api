import { ErrorPayload } from "./error-payload.interface";

export interface BaseValidateJobPostIdsReponseGrpc<T>{
    success: boolean;
    code: string;
    message: string;
    jobIds?: T ;
    error?: ErrorPayload;
}