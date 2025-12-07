import { ErrorPayload } from "./error-payload.interface";

export interface BaseRoleResponsesGrpc <T>{

    success: boolean;
    code: string;
    message: string;
    roles?: T;
    error?: ErrorPayload;
 
}