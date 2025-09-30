import { ErrorPayload } from "./error-payload.interface";

export interface BaseRolePermissionResponseGrpc <T>{

    success: boolean;
    message: string;
    code: string;
    rolePermission: T;
    error: ErrorPayload;
}