// Generic BaseResponse from gRPC

export interface BaseCategoriesGrpcResponse<T> {
    success: boolean;   
    message: string;
    code: string;
    categories?: T;
    error?: string; 

}