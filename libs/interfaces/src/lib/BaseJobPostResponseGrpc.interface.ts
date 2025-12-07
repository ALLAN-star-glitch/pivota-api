import { ErrorPayload } from "./error-payload.interface";

export interface BaseJobPostResponseGrpc<T> {

    success: boolean;
    message: string;
    code: string;
    jobPost: T;
    error: ErrorPayload

}
