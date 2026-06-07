// apps/payment-service/src/daraja/daraja.constants.ts
export const DARAJA_CONFIG = {
  // API URLs
  SANDBOX_BASE_URL: 'https://sandbox.safaricom.co.ke',
  PRODUCTION_BASE_URL: 'https://api.safaricom.co.ke',
  
  // Endpoints
  OAUTH_ENDPOINT: '/oauth/v1/generate?grant_type=client_credentials',
  STK_PUSH_ENDPOINT: '/mpesa/stkpush/v1/processrequest',
  STK_PUSH_QUERY_ENDPOINT: '/mpesa/stkpushquery/v1/query',
  TRANSACTION_STATUS_ENDPOINT: '/mpesa/transactionstatus/v1/query',
  ACCOUNT_BALANCE_ENDPOINT: '/mpesa/accountbalance/v1/query',
  
  // Transaction Types
  TRANSACTION_TYPES: {
    PAY_BILL: 'CustomerPayBillOnline',
    BUY_GOODS: 'CustomerBuyGoodsOnline',
  },
  
  // Identifier Types
  IDENTIFIER_TYPES: {
    MSISDN: '1',      // Phone number
    TILL_NUMBER: '2',  // Till number
    SHORTCODE: '4',    // Shortcode
  },
  
  // Result Codes
  RESULT_CODES: {
    SUCCESS: '0',
    PENDING: '1037',
  },
};