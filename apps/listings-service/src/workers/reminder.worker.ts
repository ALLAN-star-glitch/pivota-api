import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '@pivota-api/shared-redis';
import { BookingStatus } from '../../generated/prisma/client';

@Injectable()
export class ReminderWorker implements OnModuleInit {
  private readonly logger = new Logger(ReminderWorker.name);
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {
    console.log('🔥 ReminderWorker CONSTRUCTOR called');
    this.logger.log('ReminderWorker constructor called');
  }

  async onModuleInit() {
    console.log('🔥 ReminderWorker.onModuleInit() STARTED');
    this.logger.log('ReminderWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 ReminderWorker already initialized, skipping');
      this.logger.log('ReminderWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 ReminderWorker.initialize() STARTED');
    this.logger.log('ReminderWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Any initialization logic here (if needed)
      // For now, just mark as initialized
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ ReminderWorker initialized in ${elapsed}ms`);
      console.log(`🔥 ReminderWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 ReminderWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize reminder worker: ${error.message}`);
      throw error;
    }
  }

  // Run every 1 minute for testing
  @Cron('*/1 * * * *')
  async processUpcomingReminders() {
    if (!this.initialized) {
      console.log('⚠️ ReminderWorker not initialized yet, skipping cron job');
      return;
    }
    await this.sendReminders();
  }

  // Manual trigger for testing
  async sendReminders() {
    if (!this.initialized) {
      console.log('⚠️ ReminderWorker not initialized yet, cannot send reminders');
      return;
    }

    this.logger.log('Checking for upcoming bookings that need reminders...');
    console.log('🔔 ReminderWorker: Checking for upcoming bookings...');
    
    const now = new Date();
    const sixtyMinutesLater = new Date(now.getTime() + 60 * 60 * 1000);

    const upcomingBookings = await this.prisma.serviceBooking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        scheduledDate: {
          gte: now,
          lte: sixtyMinutesLater,
        },
        OR: [
          { reminderSent24h: false },
          { reminderSent12h: false },
          { reminderSent1h: false },
        ],
      },
    });

    this.logger.log(`Found ${upcomingBookings.length} upcoming bookings`);
    console.log(`🔔 ReminderWorker: Found ${upcomingBookings.length} upcoming bookings`);

    for (const booking of upcomingBookings) {
      const scheduledDate = new Date(booking.scheduledDate);
      const minutesRemaining = Math.floor((scheduledDate.getTime() - now.getTime()) / (60 * 1000));

      this.logger.log(`Booking ${booking.externalId}: ${minutesRemaining} minutes remaining`);
      console.log(`🔔 ReminderWorker: Booking ${booking.externalId}: ${minutesRemaining} minutes remaining`);

      if (minutesRemaining <= 0) continue;

      // 60-minute reminder
      if (minutesRemaining <= 60 && minutesRemaining > 30 && !booking.reminderSent24h) {
        await this.queue.addJob('notification-queue', 'booking.reminder', {
          bookingExternalId: booking.externalId,
        });
        await this.prisma.serviceBooking.update({
          where: { id: booking.id },
          data: { reminderSent24h: true },
        });
        this.logger.log(`[TEST] 60min reminder queued for ${booking.externalId}`);
        console.log(`🔔 ReminderWorker: 60min reminder queued for ${booking.externalId}`);
      }

      // 30-minute reminder
      if (minutesRemaining <= 30 && minutesRemaining > 5 && !booking.reminderSent12h) {
        await this.queue.addJob('notification-queue', 'booking.reminder', {
          bookingExternalId: booking.externalId,
        });
        await this.prisma.serviceBooking.update({
          where: { id: booking.id },
          data: { reminderSent12h: true },
        });
        this.logger.log(`[TEST] 30min reminder queued for ${booking.externalId}`);
        console.log(`🔔 ReminderWorker: 30min reminder queued for ${booking.externalId}`);
      }

      // 5-minute reminder
      if (minutesRemaining <= 5 && minutesRemaining > 0 && !booking.reminderSent1h) {
        await this.queue.addJob('notification-queue', 'booking.reminder', {
          bookingExternalId: booking.externalId,
        });
        await this.prisma.serviceBooking.update({
          where: { id: booking.id },
          data: { reminderSent1h: true },
        });
        this.logger.log(`[TEST] 5min reminder queued for ${booking.externalId}`);
        console.log(`🔔 ReminderWorker: 5min reminder queued for ${booking.externalId}`);
      }
    }
  }
}