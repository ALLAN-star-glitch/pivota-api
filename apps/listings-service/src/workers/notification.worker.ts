// apps/listings-service/src/workers/notification.worker.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
console.log('🔥 NOTIFICATION WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

// Types for notification jobs
interface BookingNotificationData {
  bookingId: string;
  clientId: string;
  contractorId: string;
  serviceTitle: string;
  scheduledDate: Date;
  locationCity: string;
  agreedPrice: number;
  currency: string;
  customerNotes?: string;
}

interface StatusChangeNotificationData {
  bookingId: string;
  clientId: string;
  contractorId: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  performedBy: string;
}

@Injectable()
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name);
  private initialized = false;
  private rabbitMQConnected = false;

  constructor(
    private queue: QueueService,
    private prisma: PrismaService,
    @Inject('NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
  ) {
    console.log('🔥 NotificationWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 NotificationWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 NotificationWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 NotificationWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Connect to RabbitMQ
      await this.connectToRabbitMQ();
      
      // Create worker to process notification jobs
      this.queue.createWorker('notification-queue', async (job) => {
        await this.processNotificationJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Notification worker initialized in ${elapsed}ms`);
      console.log(`🔥 NotificationWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 NotificationWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize notification worker: ${error.message}`);
      throw error;
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    if (this.rabbitMQConnected) {
      return;
    }

    try {
      console.log('📧 Connecting NotificationWorker to RabbitMQ...');
      await this.notificationBus.connect();
      this.rabbitMQConnected = true;
      console.log('✅✅✅ NotificationWorker connected to RabbitMQ ✅✅✅');
      this.logger.log('RabbitMQ connection established successfully');
    } catch (err: any) {
      console.error('❌❌❌ NotificationWorker RabbitMQ connection FAILED ❌❌❌');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
      throw err;
    }
  }

  private async processNotificationJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📧 Processing notification job ${id}: ${name}`);
    
    try {
      if (!this.rabbitMQConnected) {
        await this.connectToRabbitMQ();
      }
      
      switch (name) {
        case 'booking.created':
          await this.handleBookingCreated(data);
          break;
          
        case 'booking.confirmed':
          await this.handleBookingConfirmed(data);
          break;
          
        case 'booking.declined':
          await this.handleBookingDeclined(data);
          break;
          
        case 'booking.cancelled':
          await this.handleBookingCancelled(data);
          break;
          
        case 'booking.completed':
          await this.handleBookingCompleted(data);
          break;
          
        case 'booking.reminder':
          await this.handleBookingReminder(data);
          break;
          
        case 'contractor.daily.summary':
          await this.handleDailySummary(data);
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown notification job type: ${name}`);
      }
      
      this.logger.log(`✅ Notification job ${name} completed`);
      
    } catch (error: any) {
      this.logger.error(`❌ Notification job ${name} failed: ${error.message}`);
      throw error;
    }
  }

  // ==================== HANDLE BOOKING NOTIFICATIONS ====================

  private async handleBookingCreated(data: BookingNotificationData): Promise<void> {
    this.logger.log(`📧 Handling booking.created notification for booking ${data.bookingId}`);
    
    // Get full booking details with client and contractor info
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
      include: {
        service: true,
      },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for notification`);
      return;
    }
    
    // Format date for display
    const scheduledDateFormatted = new Date(booking.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Emit events to RabbitMQ for processing by email/SMS workers
    this.notificationBus.emit('booking.created.notification', {
      bookingId: booking.id,
      externalId: booking.externalId,
      contractor: {
        id: booking.contractorId,
        name: booking.contractorName,
      },
      client: {
        id: booking.clientId,
        name: booking.clientName,
      },
      service: {
        title: booking.serviceTitle,
        scheduledDate: scheduledDateFormatted,
        location: booking.locationCity,
        price: `${booking.agreedPrice} ${booking.currency}`,
        notes: booking.customerNotes,
      },
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`✅ Booking created notification emitted for ${data.bookingId}`);
  }

  private async handleBookingConfirmed(data: StatusChangeNotificationData): Promise<void> {
    this.logger.log(`📧 Handling booking.confirmed notification for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for notification`);
      return;
    }
    
    const scheduledDateFormatted = new Date(booking.scheduledDate!).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    this.notificationBus.emit('booking.confirmed.notification', {
      bookingId: booking.id,
      externalId: booking.externalId,
      client: {
        id: booking.clientId,
        name: booking.clientName,
      },
      service: {
        title: booking.serviceTitle,
        scheduledDate: scheduledDateFormatted,
        location: booking.locationCity,
      },
      contractor: {
        name: booking.contractorName,
      },
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`✅ Booking confirmed notification emitted for ${data.bookingId}`);
  }

  private async handleBookingDeclined(data: StatusChangeNotificationData): Promise<void> {
    this.logger.log(`📧 Handling booking.declined notification for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for notification`);
      return;
    }
    
    this.notificationBus.emit('booking.declined.notification', {
      bookingId: booking.id,
      externalId: booking.externalId,
      client: {
        id: booking.clientId,
        name: booking.clientName,
      },
      service: {
        title: booking.serviceTitle,
        scheduledDate: booking.scheduledDate,
      },
      reason: data.reason || 'No reason provided',
      contractor: {
        name: booking.contractorName,
      },
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`✅ Booking declined notification emitted for ${data.bookingId}`);
  }

  private async handleBookingCancelled(data: StatusChangeNotificationData): Promise<void> {
    this.logger.log(`📧 Handling booking.cancelled notification for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for notification`);
      return;
    }
    
    const cancelledBy = data.performedBy === booking.clientId ? 'client' : 'contractor';
    
    this.notificationBus.emit('booking.cancelled.notification', {
      bookingId: booking.id,
      externalId: booking.externalId,
      cancelledBy,
      reason: data.reason || 'No reason provided',
      client: {
        id: booking.clientId,
        name: booking.clientName,
      },
      contractor: {
        id: booking.contractorId,
        name: booking.contractorName,
      },
      service: {
        title: booking.serviceTitle,
        scheduledDate: booking.scheduledDate,
      },
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`✅ Booking cancelled notification emitted for ${data.bookingId}`);
  }

  private async handleBookingCompleted(data: StatusChangeNotificationData): Promise<void> {
    this.logger.log(`📧 Handling booking.completed notification for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for notification`);
      return;
    }
    
    this.notificationBus.emit('booking.completed.notification', {
      bookingId: booking.id,
      externalId: booking.externalId,
      client: {
        id: booking.clientId,
        name: booking.clientName,
      },
      contractor: {
        id: booking.contractorId,
        name: booking.contractorName,
      },
      service: {
        title: booking.serviceTitle,
      },
      amount: `${booking.agreedPrice} ${booking.currency}`,
      timestamp: new Date().toISOString(),
    });
    
    // Also queue request for review
    await this.queue.addJob(
      'notification-queue',
      'review.request',
      {
        bookingId: booking.id,
        clientId: booking.clientId,
        contractorId: booking.contractorId,
        serviceTitle: booking.serviceTitle,
      },
      { delay: 3600000 } // 1 hour delay
    );
    
    this.logger.log(`✅ Booking completed notification emitted for ${data.bookingId}`);
  }

  private async handleBookingReminder(data: { bookingId: string }): Promise<void> {
    this.logger.log(`📧 Handling booking.reminder for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
    });
    
    if (!booking || booking.status !== 'CONFIRMED') {
      return;
    }
    
    const scheduledDate = new Date(booking.scheduledDate!);
    const hoursBefore = Math.floor((scheduledDate.getTime() - Date.now()) / 3600000);
    
    if (hoursBefore <= 24 && hoursBefore > 0) {
      this.notificationBus.emit('booking.reminder.notification', {
        bookingId: booking.id,
        externalId: booking.externalId,
        client: {
          id: booking.clientId,
          name: booking.clientName,
        },
        contractor: {
          id: booking.contractorId,
          name: booking.contractorName,
        },
        service: {
          title: booking.serviceTitle,
          scheduledDate: scheduledDate.toLocaleString('en-KE', {
            dateStyle: 'full',
            timeStyle: 'short',
          }),
          location: booking.locationCity,
        },
        hoursRemaining: hoursBefore,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.log(`✅ Reminder notification emitted for booking ${data.bookingId}`);
    }
  }

  private async handleDailySummary(data: { contractorId: string; date: Date }): Promise<void> {
    this.logger.log(`📧 Handling daily summary for contractor ${data.contractorId}`);
    
    const startOfDay = new Date(data.date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(data.date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookings = await this.prisma.serviceBooking.findMany({
      where: {
        contractorId: data.contractorId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    
    this.notificationBus.emit('contractor.daily.summary.notification', {
      contractorId: data.contractorId,
      date: data.date.toISOString(),
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
      completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
      cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
      totalEarnings: bookings
        .filter(b => b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.agreedPrice || 0), 0),
      bookings: bookings.map(b => ({
        id: b.id,
        time: b.scheduledDate?.toLocaleTimeString(),
        clientName: b.clientName,
        serviceTitle: b.serviceTitle,
        status: b.status,
        price: `${b.agreedPrice} ${b.currency}`,
      })),
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`✅ Daily summary emitted for contractor ${data.contractorId}`);
  }
}