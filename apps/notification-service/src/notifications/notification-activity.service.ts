import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type NotificationChannel = 'sms' | 'email';
export type NotificationStatus = 'success' | 'error';

export interface NotificationActivityRecord {
  id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  source: string;
  recipient: string;
  message?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  providerResponse?: unknown;
  error?: string;
}

export interface NotificationActivityFilter {
  channel?: NotificationChannel;
  status?: NotificationStatus;
  recipient?: string;
  limit?: number;
}

@Injectable()
export class NotificationActivityService {
  private readonly maxRecords = 500;
  private readonly records: NotificationActivityRecord[] = [];

  record(
    activity: Omit<NotificationActivityRecord, 'id' | 'createdAt'>,
  ): NotificationActivityRecord {
    const entry: NotificationActivityRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...activity,
    };

    this.records.unshift(entry);
    if (this.records.length > this.maxRecords) {
      this.records.length = this.maxRecords;
    }

    return entry;
  }

  list(filter: NotificationActivityFilter = {}): NotificationActivityRecord[] {
    const { channel, status, recipient, limit = 50 } = filter;
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(Math.max(limit, 1), 200)
      : 50;

    return this.records
      .filter((record) => {
        if (channel && record.channel !== channel) return false;
        if (status && record.status !== status) return false;
        if (
          recipient &&
          !record.recipient.toLowerCase().includes(recipient.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .slice(0, normalizedLimit);
  }
}
