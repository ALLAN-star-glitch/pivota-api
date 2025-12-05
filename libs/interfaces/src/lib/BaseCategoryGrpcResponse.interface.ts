// Generic BaseResponse from gRPC

export interface BaseCategoryGrpcResponse<T> {
    success: boolean;   
    message: string;
    code: string;
    category?: T;
    error?: string; 

}