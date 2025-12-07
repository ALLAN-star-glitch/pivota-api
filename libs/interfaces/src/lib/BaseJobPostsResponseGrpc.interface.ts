import { ErrorPayload } from "./error-payload.interface";

export interface BaseJobPostsResponseGrpc<T> {
    
    success: boolean;
    message: string;
    code: string;
    jobPosts: T;
    error: ErrorPayload

}
