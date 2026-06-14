/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Data for service.started notification
 */
export interface ServiceStartedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  startedAt: string;
  bookingExternalId: string;
}

/**
 * Data for service.completed notification
 */
export interface ServiceCompletedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  completedAt: string;
  autoReleaseAt: string;
  autoReleaseHours: number;
  bookingExternalId: string;
  evidenceUrls: string[];
  servicePrice: number;
  totalAmount: number;
  currency: string;
}

/**
 * Data for customer.confirmed notification
 */
export interface CustomerConfirmedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  confirmedAt: string;
  paymentReleasedAt: string;
  servicePrice: number;
  totalAmount: number;
  currency: string;
  bookingExternalId: string;
}

/**
 * Data for customer.dissatisfied notification
 */
export interface CustomerDissatisfiedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  dissatisfiedAt: string;
  bookingExternalId: string;
  disputeId: string;
}

/**
 * Data for payment.auto-released notification
 */
export interface PaymentAutoReleasedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  autoReleasedAt: string;
  amountReleased: number;
  currency: string;
  bookingExternalId: string;
}

/**
 * Data for evidence.uploaded notification
 */
export interface EvidenceUploadedData {
  customerEmail: string;      // ADDED: Customer email for notifications
  customerName: string;       // ADDED: Customer name for notifications
  contractorEmail: string;
  contractorName: string;
  serviceTitle: string;
  bookingExternalId: string;
  evidenceCount: number;
  evidenceUrls: string[];
  uploadedAt: string;
}