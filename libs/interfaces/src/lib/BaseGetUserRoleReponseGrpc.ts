import { ErrorPayload } from "./error-payload.interface";

export interface BaseGetUserRoleReponseGrpc <T>{
    success: boolean;
    code: string;
    message: string;
    role?: T;
    error?: ErrorPayload;
}

