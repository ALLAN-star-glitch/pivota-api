export interface PesapalTransactionStatus {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  status_code: number; // 1 = COMPLETED, 2 = FAILED, etc.
  merchant_reference: string;
  currency: string;
}