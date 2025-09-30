import { ErrorPayload } from "./error-payload.interface";

export interface BaseUserRoleResponseGrpc <T>{

    success: boolean;
    code: string;
    message: string;
    userRole?: T;
    error?: ErrorPayload;
 
}