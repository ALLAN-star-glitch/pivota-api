import { ErrorPayload } from "./error-payload.interface";

export interface BasePermissionResponseGrpc <T>{

    success: boolean;
    code: string;
    message: string;
    descriptioAction: T;
    error?: ErrorPayload;
 
}