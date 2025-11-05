import { ErrorPayload } from './error-payload.interface';

export interface BaseRefreshTokenResponseGrpc<T>{

    success: boolean;
    code: string;
    message: string;
    tokens?: T;
    error?: ErrorPayload;

}




