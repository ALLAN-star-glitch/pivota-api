// Generic BaseResponse from gRPC

export interface BaseUsersResponseGrpc<T> {
    success: boolean;   
    message: string;
    code: string;
    users?: T;
    error?: string; 

}