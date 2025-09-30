import { ErrorPayload } from "./error-payload.interface";

export interface BaseRoleResponseGrpc <T>{

    success: boolean;
    code: string;
    message: string;
    role?: T;
    error?: ErrorPayload;
 
}