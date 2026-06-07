/* eslint-disable @typescript-eslint/no-explicit-any */
console.log('🔥 NOTIFICATION WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '../../generated/prisma/client';

// Updated types to match the payload from your service
interface BookingCreatedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  price: string;
  notes?: string; 
  bookingExternalId: string;
}


interface ServiceOfferingCreatedData {
  to: string;
  professionalName: string;
  serviceTitle: string;
  serviceExternalId: string;
  categoryName: string;
  basePrice: number;
  priceUnit: string;
  currency: string;
  createdAt: string;
}


interface BookingConfirmedData {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  contractorEmail: string;
  contractorName: string;
  contractorPhone: string;
  serviceTitle: string;
  scheduledDate: Date;
  location: string;
  price: string;
  bookingExternalId: string;
}

interface BookingDeclinedData {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  contractor: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    title: string;
    scheduledDate: Date;
    location: string;
  };
  decline: {
    reason: string;
    declinedBy: string;
    declinedAt: string;
  };
  bookingExternalId: string;
}

interface BookingCancelledData {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  contractor: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    title: string;
    scheduledDate: Date;
    location: string;
  };
  cancellation: {
    reason: string;
    cancelledBy: string;
    cancelledAt: string;
  };
  bookingExternalId: string;
}

interface BookingCompletedData {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  contractor: {
    name: string;
    email: string;
    phone: string;
  };
  service: {
    title: string;
    scheduledDate: Date;
    location: string;
    price: string;
  };
  completion: {
    completedBy: string;
    completedAt: string;
  };
  bookingExternalId: string;
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
    this.logger.log('NotificationWorker constructor called');
  }

  async onModuleInit() {
    console.log('🔥 NotificationWorker.onModuleInit() STARTED');
    this.logger.log('NotificationWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 NotificationWorker already initialized, skipping');
      this.logger.log('NotificationWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 NotificationWorker.initialize() STARTED');
    this.logger.log('NotificationWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Connect to RabbitMQ first
      await this.connectToRabbitMQ();
      
      // Create worker to process notification jobs using Redis/BullMQ
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
    } catch (err) {
      console.error('❌❌❌ NotificationWorker RabbitMQ connection FAILED ❌❌❌');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
      throw err;
    }
  }

  private async processNotificationJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📧 Processing notification job ${id}: ${name}`);
    console.log(`📧 Processing notification job ${id}: ${name}`);
    const startTime = Date.now();
    
    try {
      // Ensure RabbitMQ is connected before emitting
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
          
        case 'review.request':
          await this.handleReviewRequest(data);
          break;

        case 'service-offering.created':
          await this.handleServiceOfferingCreated(data);
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown notification job type: ${name}`);
          console.log(`⚠️ Unknown notification job type: ${name}`);
      }
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Notification job ${name} completed in ${elapsed}ms`);
      console.log(`✅ Notification job ${name} completed in ${elapsed}ms`);
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`❌ Notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  // ==================== HANDLE BOOKING NOTIFICATIONS ====================

  private async handleBookingCreated(data: BookingCreatedData): Promise<void> {
    this.logger.log(`📧 Handling booking.created notification`);
    console.log(`📧 Handling booking.created notification`);
    
    // Format date for display
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Prepare booking data for email
    const bookingData = {
      bookingExternalId: data.bookingExternalId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      contractorName: data.contractorName,
      contractorEmail: data.contractorEmail,
      contractorPhone: data.contractorPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      price: data.price,
      notes: data.notes,
    };
    
    // Emit directly to RabbitMQ for customer
    this.notificationBus.emit('booking-created-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      price: data.price,
      notes: data.notes,
    });
    
    // Emit directly to RabbitMQ for contractor
    this.notificationBus.emit('booking-created-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      price: data.price,
      bookingExternalId: data.bookingExternalId,
      notes: data.notes,
    });
    
    this.logger.log(`✅ Booking created events emitted for ${data.customerEmail} and ${data.contractorEmail}`);
    console.log(`✅ Booking created events emitted for ${data.customerEmail} and ${data.contractorEmail}`);
  }

  private async handleBookingConfirmed(data: BookingConfirmedData): Promise<void> {
    this.logger.log(`📧 Handling booking.confirmed notification for ${data.bookingExternalId}`);
    console.log(`📧 Handling booking.confirmed notification for ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Emit directly to RabbitMQ for customer
    this.notificationBus.emit('booking-confirmed-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      price: data.price,
    });
    
    // Emit directly to RabbitMQ for contractor
    this.notificationBus.emit('booking-confirmed-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      price: data.price,
    });
    
    this.logger.log(`✅ Booking confirmed events emitted for ${data.customerEmail} and ${data.contractorEmail}`);
    console.log(`✅ Booking confirmed events emitted for ${data.customerEmail} and ${data.contractorEmail}`);
  }

  private async handleBookingDeclined(data: BookingDeclinedData): Promise<void> {
    this.logger.log(`📧 Handling booking.declined notification for ${data.bookingExternalId}`);
    console.log(`📧 Handling booking.declined notification for ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.service.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Emit directly to RabbitMQ for customer
    this.notificationBus.emit('booking-declined-customer', {
      to: data.customer.email,
      customerName: data.customer.name,
      contractorName: data.contractor.name,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      location: data.service.location,
      reason: data.decline.reason,
      declinedBy: data.decline.declinedBy,
    });
    
    // Emit directly to RabbitMQ for contractor
    this.notificationBus.emit('booking-declined-contractor', {
      to: data.contractor.email,
      contractorName: data.contractor.name,
      customerName: data.customer.name,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      reason: data.decline.reason,
    });
    
    this.logger.log(`✅ Booking declined events emitted for ${data.customer.email} and ${data.contractor.email}`);
    console.log(`✅ Booking declined events emitted for ${data.customer.email} and ${data.contractor.email}`);
  }

  private async handleBookingCancelled(data: BookingCancelledData): Promise<void> {
    this.logger.log(`📧 Handling booking.cancelled notification for ${data.bookingExternalId}`);
    console.log(`📧 Handling booking.cancelled notification for ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.service.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Emit directly to RabbitMQ for customer
    this.notificationBus.emit('booking-cancelled-customer', {
      to: data.customer.email,
      customerName: data.customer.name,
      contractorName: data.contractor.name,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      location: data.service.location,
      reason: data.cancellation.reason,
      cancelledBy: data.cancellation.cancelledBy,
    });
    
    // Emit directly to RabbitMQ for contractor
    this.notificationBus.emit('booking-cancelled-contractor', {
      to: data.contractor.email,
      contractorName: data.contractor.name,
      customerName: data.customer.name,
      customerPhone: data.customer.phone,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      location: data.service.location,
      reason: data.cancellation.reason,
      cancelledBy: data.cancellation.cancelledBy,
    });
    
    this.logger.log(`✅ Booking cancelled events emitted for ${data.customer.email} and ${data.contractor.email}`);
    console.log(`✅ Booking cancelled events emitted for ${data.customer.email} and ${data.contractor.email}`);
  }

  private async handleBookingCompleted(data: BookingCompletedData): Promise<void> {
    this.logger.log(`📧 Handling booking.completed notification for ${data.bookingExternalId}`);
    console.log(`📧 Handling booking.completed notification for ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.service.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Emit directly to RabbitMQ for customer
    this.notificationBus.emit('booking-completed-customer', {
      to: data.customer.email,
      customerName: data.customer.name,
      contractorName: data.contractor.name,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      location: data.service.location,
      price: data.service.price,
    });
    
    // Emit directly to RabbitMQ for contractor
    this.notificationBus.emit('booking-completed-contractor', {
      to: data.contractor.email,
      contractorName: data.contractor.name,
      customerName: data.customer.name,
      serviceTitle: data.service.title,
      scheduledDate: scheduledDateFormatted,
      location: data.service.location,
      price: data.service.price,
    });
    
    this.logger.log(`✅ Booking completed events emitted for ${data.customer.email} and ${data.contractor.email}`);
    console.log(`✅ Booking completed events emitted for ${data.customer.email} and ${data.contractor.email}`);
    
    // Emit review request after 24 hours (delayed)
    setTimeout(async () => {
      this.notificationBus.emit('review-request', {
        to: data.customer.email,
        customerName: data.customer.name,
        serviceTitle: data.service.title,
        bookingId: data.bookingExternalId,
      });
    }, 86400000); // 24 hours
  }

  private async handleBookingReminder(data: { bookingExternalId: string }): Promise<void> {
    this.logger.log(`📧 Handling booking.reminder for ${data.bookingExternalId}`);
    console.log(`📧 Handling booking.reminder for ${data.bookingExternalId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: data.bookingExternalId },
    });
    
    if (!booking || booking.status !== BookingStatus.CONFIRMED) {
      this.logger.warn(`Booking ${data.bookingExternalId} not found or not confirmed for reminder`);
      console.log(`⚠️ Booking ${data.bookingExternalId} not found or not confirmed for reminder`);
      return;
    }
    
    const scheduledDate = new Date(booking.scheduledDate!);
    const hoursBefore = Math.floor((scheduledDate.getTime() - Date.now()) / 3600000);
    
    if (hoursBefore <= 24 && hoursBefore > 0) {
      const scheduledDateFormatted = scheduledDate.toLocaleString('en-KE', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      
      // Emit directly to RabbitMQ for customer
      this.notificationBus.emit('booking-reminder-customer', {
        to: booking.clientEmail,
        customerName: booking.clientName,
        contractorName: booking.contractorName,
        serviceTitle: booking.serviceTitle,
        scheduledDate: scheduledDateFormatted,
        location: booking.locationCity,
        hoursRemaining: hoursBefore,
      });
      
      // Emit directly to RabbitMQ for contractor
      this.notificationBus.emit('booking-reminder-contractor', {
        to: booking.contractorEmail,
        contractorName: booking.contractorName,
        customerName: booking.clientName,
        customerPhone: booking.clientPhone,
        serviceTitle: booking.serviceTitle,
        scheduledDate: scheduledDateFormatted,
        location: booking.locationCity,
        hoursRemaining: hoursBefore,
      });
      
      this.logger.log(`✅ Reminder events emitted for booking ${data.bookingExternalId}`);
      console.log(`✅ Reminder events emitted for booking ${data.bookingExternalId}`);
    }
  }

  private async handleServiceOfferingCreated(data: ServiceOfferingCreatedData): Promise<void> {
  this.logger.log(`📧 Sending service offering confirmation to ${data.to}`);
  
  const formattedPrice = `${data.basePrice.toLocaleString()} ${data.currency}`;
  const formattedDate = new Date(data.createdAt).toLocaleString('en-KE', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  
  // Send email to professional
  this.notificationBus.emit('service-offering-created', {
    to: data.to,
    professionalName: data.professionalName,
    serviceTitle: data.serviceTitle,
    serviceExternalId: data.serviceExternalId,
    categoryName: data.categoryName,
    basePrice: formattedPrice,
    priceUnit: data.priceUnit,
    createdAt: formattedDate,
  });
  
  this.logger.log(`✅ Service offering confirmation sent to ${data.to}`);
}

  private async handleDailySummary(data: { contractorId: string; date: Date }): Promise<void> {
    this.logger.log(`📧 Handling daily summary for contractor ${data.contractorId}`);
    console.log(`📧 Handling daily summary for contractor ${data.contractorId}`);
    
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
    
    if (bookings.length === 0) {
      this.logger.log(`No bookings for contractor ${data.contractorId} on ${data.date}`);
      console.log(`📭 No bookings for contractor ${data.contractorId} on ${data.date}`);
      return;
    }
    
    const contractorEmail = bookings[0]?.contractorEmail;
    
    if (!contractorEmail) {
      this.logger.warn(`No email found for contractor ${data.contractorId}`);
      console.log(`⚠️ No email found for contractor ${data.contractorId}`);
      return;
    }
    
    const totalEarnings = bookings
      .filter(b => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
    
    // Emit directly to RabbitMQ
    this.notificationBus.emit('contractor-daily-summary', {
      to: contractorEmail,
      contractorName: bookings[0]?.contractorName,
      date: data.date.toISOString(),
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
      completedBookings: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      cancelledBookings: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      totalEarnings,
      bookings: bookings.map(b => ({
        time: b.scheduledDate?.toLocaleTimeString(),
        clientName: b.clientName,
        serviceTitle: b.serviceTitle,
        status: b.status,
        price: `${b.agreedPrice} ${b.currency}`,
      })),
    });
    
    this.logger.log(`✅ Daily summary event emitted for contractor ${data.contractorId}`);
    console.log(`✅ Daily summary event emitted for contractor ${data.contractorId}`);
  }

  private async handleReviewRequest(data: { bookingId: string; clientId: string; contractorId: string; serviceTitle: string }): Promise<void> {
    this.logger.log(`📧 Handling review.request for booking ${data.bookingId}`);
    console.log(`📧 Handling review.request for booking ${data.bookingId}`);
    
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: data.bookingId },
      select: { clientEmail: true, clientName: true, serviceTitle: true },
    });
    
    if (!booking) {
      this.logger.warn(`Booking ${data.bookingId} not found for review request`);
      console.log(`⚠️ Booking ${data.bookingId} not found for review request`);
      return;
    }
    
    // Emit directly to RabbitMQ
    this.notificationBus.emit('review-request', {
      to: booking.clientEmail,
      customerName: booking.clientName,
      serviceTitle: booking.serviceTitle,
      bookingId: data.bookingId,
    });
    
    this.logger.log(`✅ Review request event emitted for ${booking.clientEmail}`);
    console.log(`✅ Review request event emitted for ${booking.clientEmail}`);
  }
}