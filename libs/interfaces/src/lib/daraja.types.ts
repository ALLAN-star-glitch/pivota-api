// apps/payment-service/src/daraja/daraja.types.ts
export interface AccessTokenResponse {
  access_token: string;
  expires_in: string;
}

export interface STKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  Amount: number;
  PartyA: string; // Customer phone number
  PartyB: string; // Business shortcode
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKPushQueryRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  CheckoutRequestID: string;
}

export interface STKPushQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export interface TransactionStatusRequest {
  Initiator: string;
  SecurityCredential: string;
  CommandID: 'TransactionStatusQuery';
  TransactionID: string;
  PartyA: string;
  IdentifierType: '1' | '2' | '4';
  ResultURL: string;
  QueueTimeOutURL: string;
  Remarks: string;
  Occasion?: string;
}

export interface AccountBalanceRequest {
  Initiator: string;
  SecurityCredential: string;
  CommandID: 'AccountBalance';
  PartyA: string;
  IdentifierType: '1' | '2' | '4';
  ResultURL: string;
  QueueTimeOutURL: string;
  Remarks: string;
}