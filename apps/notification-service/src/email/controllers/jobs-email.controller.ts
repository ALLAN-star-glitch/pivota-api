// apps/notification-service/src/email/controllers/jobs-email.controller.ts

/**
 * Jobs Email Controller
 * 
 * Handles job-related email events from the email queue.
 * This controller processes jobs added by the JobsNotificationWorker in the listings service.
 * 
 * Events Handled:
 * - job-posted-creator - Confirmation email when a user posts a job
 * - job-posted-account - Notification to account owner (for organizations)
 * - job-application-submitted-employer - Notification when someone applies to a job
 * - job-application-submitted-applicant - Confirmation to the applicant
 * - job-application-status-changed-applicant - Status update notification to applicant
 * - job-application-status-changed-employer - Status update notification to employer
 * - job-closed-creator - Confirmation when a job is closed
 * - job-closed-account - Notification to account owner when a job is closed
 * - job-application-reminder-employer - Reminder about pending applications
 * 
 * @example
 * // Event payload for job posted creator
 * {
 *   to: 'employer@example.com',
 *   creatorName: 'John Doe',
 *   jobTitle: 'Senior Developer',
 *   jobId: 'job-id-123',
 *   jobExternalId: 'job-uuid-123',
 *   jobUrl: 'https://pivota.com/jobs/job-uuid-123',
 *   dashboardUrl: 'https://pivota.com/dashboard/jobs/job-uuid-123',
 *   location: 'Nairobi, Kenya',
 *   payInfo: '150,000 KES per month',
 *   employmentType: 'Permanent',
 *   paymentType: 'Salary',
 *   workArrangement: 'On-site',
 *   commitment: 'Full Time',
 *   experienceLevel: 'Senior',
 *   educationLevel: "Bachelor's Degree",
 *   skills: 'React, Node.js, TypeScript',
 *   applicationDeadline: 'Dec 31, 2024',
 *   createdAt: 'Dec 1, 2024 at 2:00 PM',
 *   isAnonymous: false,
 *   displayName: 'Confidential Client',
 *   contactEmail: 'hiring@company.com',
 *   hoursPerWeek: '40 hours/week'
 * }
 * 
 * // Event payload for job application submitted employer
 * {
 *   to: 'employer@example.com',
 *   employerName: 'John Doe',
 *   applicantName: 'Jane Smith',
 *   applicantEmail: 'jane@example.com',
 *   applicantPhone: '+254712345678',
 *   jobTitle: 'Senior Developer',
 *   jobLocation: 'Nairobi, Kenya',
 *   jobCategory: 'Software Development',
 *   applicationId: 'app-id-123',
 *   applicationExternalId: 'app-uuid-123',
 *   expectedPay: '150,000 KES',
 *   availabilityDate: 'Jan 15, 2025',
 *   availabilityNotes: 'Available immediately',
 *   hasRequiredEquipment: 'Yes',
 *   applicationDate: 'Dec 1, 2024 at 2:30 PM',
 *   dashboardUrl: 'https://pivota.com/dashboard/applications/app-uuid-123'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { JobsEmailService } from '../services/handlers/jobs-email.service';

@Controller()
export class JobsEmailController {
  private readonly logger = new Logger(JobsEmailController.name);

  constructor(private readonly jobsEmailService: JobsEmailService) {
    console.log('🔥🔥🔥 JobsEmailController CONSTRUCTOR CALLED 🔥🔥🔥');
  }

  /**
   * Handle job posted - Creator confirmation email
   */
  @EventPattern('job-posted-creator', Transport.RMQ)
  async handleJobPostedCreator(
    @Payload() data: {
      to: string;
      creatorName: string;
      jobTitle: string;
      jobId: string;
      jobExternalId: string;
      location: string;
      payInfo: string;
      employmentType: string;
      paymentType: string;
      workArrangement: string;
      commitment: string;
      experienceLevel: string;
      educationLevel: string;
      skills: string;
      applicationDeadline: string;
      createdAt: string;
      isAnonymous: boolean;
      displayName?: string;
      contactEmail?: string;  // ← ADD THIS
      hoursPerWeek?: string;
      jobUrl?: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB POSTED CREATOR EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Creator:', data.creatorName);
    console.log('📋 Job:', data.jobTitle);
    console.log('💰 Pay:', data.payInfo);
    console.log('📍 Location:', data.location);
    console.log('🔒 Anonymous:', data.isAnonymous ? 'Yes' : 'No');
    if (data.isAnonymous) {
      console.log('👤 Display Name:', data.displayName || 'Not set');
      console.log('📧 Contact Email:', data.contactEmail || 'Not set');
    }
    
    this.logger.debug(`[RMQ] Job posted creator event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobPostedCreator(data),
      data.to
    );
  }

  /**
   * Handle job posted - Account owner notification (for organizations)
   */
  @EventPattern('job-posted-account', Transport.RMQ)
  async handleJobPostedAccount(
    @Payload() data: {
      to: string;
      accountName: string;
      creatorName: string;
      jobTitle: string;
      jobId: string;
      jobExternalId: string;
      createdAt: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB POSTED ACCOUNT EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('🏢 Account:', data.accountName);
    console.log('👤 Creator:', data.creatorName);
    console.log('📋 Job:', data.jobTitle);
    
    this.logger.debug(`[RMQ] Job posted account event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobPostedAccount(data),
      data.to
    );
  }

  /**
   * Handle job application submitted - Employer notification
   */
  @EventPattern('job-application-submitted-employer', Transport.RMQ)
  async handleJobApplicationSubmittedEmployer(
    @Payload() data: {
      to: string;
      employerName: string;
      applicantName: string;
      applicantEmail: string;
      applicantPhone?: string;
      jobTitle: string;
      jobLocation: string;
      jobCategory: string;
      applicationId: string;
      applicationExternalId: string;
      expectedPay?: string;
      availabilityDate?: string;
      availabilityNotes?: string;
      hasRequiredEquipment?: string;
      applicationDate: string;
      applicationUrl?: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB APPLICATION SUBMITTED EMPLOYER EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Employer:', data.employerName);
    console.log('🧑‍💻 Applicant:', data.applicantName);
    console.log('📋 Job:', data.jobTitle);
    console.log('💰 Expected Pay:', data.expectedPay);
    
    this.logger.debug(`[RMQ] Job application submitted employer event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobApplicationSubmittedEmployer(data),
      data.to
    );
  }

  /**
   * Handle job application submitted - Applicant confirmation
   */
  @EventPattern('job-application-submitted-applicant', Transport.RMQ)
  async handleJobApplicationSubmittedApplicant(
    @Payload() data: {
      to: string;
      applicantName: string;
      jobTitle: string;
      jobLocation: string;
      employerName: string;
      applicationId: string;
      applicationExternalId: string;
      expectedPay?: string;
      applicationDate: string;
      applicationUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB APPLICATION SUBMITTED APPLICANT EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('🧑‍💻 Applicant:', data.applicantName);
    console.log('📋 Job:', data.jobTitle);
    console.log('🏢 Employer:', data.employerName);
    
    this.logger.debug(`[RMQ] Job application submitted applicant event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobApplicationSubmittedApplicant(data),
      data.to
    );
  }

  /**
   * Handle job application status changed - Applicant notification
   */
  @EventPattern('job-application-status-changed-applicant', Transport.RMQ)
  async handleJobApplicationStatusChangedApplicant(
    @Payload() data: {
      to: string;
      applicantName: string;
      jobTitle: string;
      employerName: string;
      applicationId: string;
      applicationExternalId: string;
      oldStatus: string;
      newStatus: string;
      reason?: string;
      updatedAt: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB APPLICATION STATUS CHANGED APPLICANT EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('🧑‍💻 Applicant:', data.applicantName);
    console.log('📋 Job:', data.jobTitle);
    console.log('📊 Status:', `${data.oldStatus} → ${data.newStatus}`);
    
    this.logger.debug(`[RMQ] Job application status changed applicant event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobApplicationStatusChangedApplicant(data),
      data.to
    );
  }

  /**
   * Handle job application status changed - Employer notification
   */
  @EventPattern('job-application-status-changed-employer', Transport.RMQ)
  async handleJobApplicationStatusChangedEmployer(
    @Payload() data: {
      to: string;
      employerName: string;
      applicantName: string;
      jobTitle: string;
      applicationId: string;
      applicationExternalId: string;
      oldStatus: string;
      newStatus: string;
      reason?: string;
      updatedAt: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB APPLICATION STATUS CHANGED EMPLOYER EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Employer:', data.employerName);
    console.log('🧑‍💻 Applicant:', data.applicantName);
    console.log('📋 Job:', data.jobTitle);
    console.log('📊 Status:', `${data.oldStatus} → ${data.newStatus}`);
    
    this.logger.debug(`[RMQ] Job application status changed employer event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobApplicationStatusChangedEmployer(data),
      data.to
    );
  }

  /**
   * Handle job closed - Creator confirmation
   */
  @EventPattern('job-closed-creator', Transport.RMQ)
  async handleJobClosedCreator(
    @Payload() data: {
      to: string;
      creatorName: string;
      jobTitle: string;
      jobId: string;
      jobExternalId: string;
      closedAt: string;
      totalApplications: number;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB CLOSED CREATOR EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Creator:', data.creatorName);
    console.log('📋 Job:', data.jobTitle);
    console.log('📊 Total Applications:', data.totalApplications);
    
    this.logger.debug(`[RMQ] Job closed creator event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobClosedCreator(data),
      data.to
    );
  }

  /**
   * Handle job closed - Account owner notification (for organizations)
   */
  @EventPattern('job-closed-account', Transport.RMQ)
  async handleJobClosedAccount(
    @Payload() data: {
      to: string;
      accountName: string;
      jobTitle: string;
      jobId: string;
      jobExternalId: string;
      closedAt: string;
      totalApplications: number;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB CLOSED ACCOUNT EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('🏢 Account:', data.accountName);
    console.log('📋 Job:', data.jobTitle);
    console.log('📊 Total Applications:', data.totalApplications);
    
    this.logger.debug(`[RMQ] Job closed account event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobClosedAccount(data),
      data.to
    );
  }

  /**
   * Handle job application reminder - Employer notification
   */
  @EventPattern('job-application-reminder-employer', Transport.RMQ)
  async handleJobApplicationReminderEmployer(
    @Payload() data: {
      to: string;
      employerName: string;
      jobTitle: string;
      jobLocation: string;
      jobId: string;
      pendingApplicationsCount: number;
      applications: {
        applicantName: string;
        applicantEmail: string;
        appliedAt: string;
        expectedPay?: string;
        availabilityDate?: string;
      }[];
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== JOB APPLICATION REMINDER EMPLOYER EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Employer:', data.employerName);
    console.log('📋 Job:', data.jobTitle);
    console.log('📊 Pending Applications:', data.pendingApplicationsCount);
    
    this.logger.debug(`[RMQ] Job application reminder employer event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.jobsEmailService.sendJobApplicationReminderEmployer(data),
      data.to
    );
  }

  /**
   * Shared private processor for event handling with proper acknowledgment
   */
  private async processEvent(
    context: RmqContext,
    action: () => Promise<void>,
    identifier: string
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    
    console.log(`🔍 STEP 1: Processing event: ${pattern} for ${identifier}`);
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      console.log(`🔍 STEP 2: About to execute action for ${identifier}`);
      await action(); 
      console.log(`🔍 STEP 3: Action completed successfully for ${identifier}`);
      
      console.log(`🔍 STEP 4: Acknowledging message for ${identifier}`);
      channel.ack(originalMsg);
      console.log(`🔍 STEP 5: Message acknowledged for ${identifier}`);
      
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🔍 STEP ERROR: Failed at ${duration}ms: ${error.message}`);
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      channel.nack(originalMsg, false, false);
    }
  }
}