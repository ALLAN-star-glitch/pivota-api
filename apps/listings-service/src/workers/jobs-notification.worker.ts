/* eslint-disable @typescript-eslint/no-explicit-any */
console.log('JOBS NOTIFICATION WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma/prisma.service';

// ============================================================
// JOB NOTIFICATION DATA TYPES
// ============================================================

interface JobPostedData {
  jobId: string;
  jobExternalId: string;
  title: string;
  description: string;
  categoryName: string;
  subCategoryName?: string;
  locationCity: string;
  locationNeighborhood?: string;
  isRemote: boolean;
  payAmount?: number;
  payRate?: string;
  isNegotiable: boolean;
  employmentType: string;
  paymentType: string;
  workArrangement: string;
  commitment: string;
  experienceLevel: string;
  educationLevel: string;
  skills: string[];
  applicationDeadline?: string;
  startDate?: string;
  isAnonymous: boolean;
  displayName?: string;
  contactEmail?: string;
  hoursPerWeek?: number;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  accountId: string;
  accountName: string;
  accountEmail?: string;
  jobUrl?: string;
  dashboardUrl?: string;
}

interface JobApplicationSubmittedData {
  jobPostId: string;
  jobTitle: string;
  jobLocation: string;
  jobCategory: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  employerId: string;
  employerName: string;
  employerEmail: string;
  applicationId: string;
  applicationExternalId: string;
  expectedPay?: number;
  availabilityDate?: string;
  availabilityNotes?: string;
  hasRequiredEquipment: boolean;
  applicationDate: string;
  applicationUrl?: string;
  dashboardUrl?: string;
}

interface JobApplicationStatusChangedData {
  applicationId: string;
  applicationExternalId: string;
  jobPostId: string;
  jobTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  employerId: string;
  employerName: string;
  employerEmail: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  updatedAt: string;
  dashboardUrl?: string;
}

interface JobClosedData {
  jobId: string;
  jobExternalId: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  accountId: string;
  accountName: string;
  accountEmail?: string;
  closedAt: string;
  totalApplications?: number;
  dashboardUrl?: string;
}

interface JobApplicationReminderData {
  jobPostId: string;
  jobTitle: string;
  jobLocation: string;
  employerId: string;
  employerName: string;
  employerEmail: string;
  pendingApplicationsCount: number;
  applications: {
    id: string;
    applicantName: string;
    applicantEmail: string;
    appliedAt: string;
    expectedPay?: number;
    availabilityDate?: string;
  }[];
  dashboardUrl?: string;
}

@Injectable()
export class JobsNotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(JobsNotificationWorker.name);
  private initialized = false;
  private rabbitMQConnected = false;

  constructor(
    private queue: QueueService,
    private prisma: PrismaService,
    @Inject('NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
  ) {
    console.log('JobsNotificationWorker CONSTRUCTOR called');
    this.logger.log('JobsNotificationWorker constructor called');
  }

  async onModuleInit() {
    console.log('JobsNotificationWorker.onModuleInit() STARTED');
    this.logger.log('JobsNotificationWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('JobsNotificationWorker already initialized, skipping');
      this.logger.log('JobsNotificationWorker already initialized, skipping');
      return;
    }
    
    console.log('JobsNotificationWorker.initialize() STARTED');
    this.logger.log('JobsNotificationWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      await this.connectToRabbitMQ();
      
      this.queue.createWorker('jobs-notification-queue', async (job) => {
        await this.processNotificationJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`Jobs notification worker initialized in ${elapsed}ms`);
      console.log(`JobsNotificationWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('JobsNotificationWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize jobs notification worker: ${error.message}`);
      throw error;
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    if (this.rabbitMQConnected) {
      return;
    }

    try {
      console.log('Connecting JobsNotificationWorker to RabbitMQ...');
      await this.notificationBus.connect();
      this.rabbitMQConnected = true;
      console.log('JobsNotificationWorker connected to RabbitMQ');
      this.logger.log('RabbitMQ connection established successfully');
    } catch (err) {
      console.error('JobsNotificationWorker RabbitMQ connection FAILED');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
      throw err;
    }
  }

  private async processNotificationJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`Processing jobs notification job ${id}: ${name}`);
    console.log(`Processing jobs notification job ${id}: ${name}`);
    const startTime = Date.now();
    
    try {
      if (!this.rabbitMQConnected) {
        await this.connectToRabbitMQ();
      }
      
      switch (name) {
        case 'job.posted':
          await this.handleJobPosted(data);
          break;
          
        case 'job.application.submitted':
          await this.handleJobApplicationSubmitted(data);
          break;
          
        case 'job.application.status.changed':
          await this.handleJobApplicationStatusChanged(data);
          break;
          
        case 'job.closed':
          await this.handleJobClosed(data);
          break;
          
        case 'job.application.reminder':
          await this.handleJobApplicationReminder(data);
          break;
          
        default:
          this.logger.warn(`Unknown jobs notification job type: ${name}`);
          console.log(`Unknown jobs notification job type: ${name}`);
      }
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`Jobs notification job ${name} completed in ${elapsed}ms`);
      console.log(`Jobs notification job ${name} completed in ${elapsed}ms`);
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`Jobs notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`Jobs notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  // ============================================================
  // HANDLE JOB POSTED NOTIFICATION
  // ============================================================

  private async handleJobPosted(data: JobPostedData): Promise<void> {
    this.logger.log(`Handling job.posted notification for job ${data.jobExternalId}`);
    console.log(`Handling job.posted notification for job ${data.jobExternalId}`);
    
    // Format pay information
    let payInfo = 'Not specified';
    if (data.payAmount && data.payRate) {
      const rateLabels: Record<string, string> = {
        'PER_HOUR': 'per hour',
        'PER_DAY': 'per day',
        'PER_WEEK': 'per week',
        'PER_MONTH': 'per month',
        'PER_PROJECT': 'per project',
        'FIXED': 'fixed',
      };
      const rateLabel = rateLabels[data.payRate] || data.payRate;
      payInfo = `${data.payAmount.toLocaleString()} KES ${rateLabel}`;
    } else if (data.payAmount) {
      payInfo = `${data.payAmount.toLocaleString()} KES`;
    }

    // Format employment type
    const employmentLabels: Record<string, string> = {
      'PERMANENT': 'Permanent',
      'CONTRACT': 'Contract',
      'CASUAL': 'Casual',
      'GIG': 'Gig',
      'FREELANCE': 'Freelance',
      'INTERNSHIP': 'Internship',
      'APPRENTICESHIP': 'Apprenticeship',
      'VOLUNTEER': 'Volunteer',
    };

    // Format work arrangement
    const workArrangementLabels: Record<string, string> = {
      'ONSITE': 'On-site',
      'REMOTE': 'Remote',
      'HYBRID': 'Hybrid',
      'FIELD': 'Field',
      'SHIFT': 'Shift',
      'FLEXIBLE': 'Flexible',
    };

    // Format commitment
    const commitmentLabels: Record<string, string> = {
      'FULL_TIME': 'Full Time',
      'PART_TIME': 'Part Time',
      'PROJECT_BASED': 'Project Based',
      'ON_CALL': 'On Call',
    };

    // Format payment type
    const paymentTypeLabels: Record<string, string> = {
      'SALARY': 'Salary',
      'WAGE': 'Wage',
      'PER_TASK': 'Per Task',
      'COMMISSION': 'Commission',
      'PROJECT_BASED': 'Project Based',
      'STIPEND': 'Stipend',
      'IN_KIND': 'In Kind',
    };

    // Format experience level
    const experienceLevelLabels: Record<string, string> = {
      'ENTRY': 'Entry Level',
      'JUNIOR': 'Junior',
      'MID_LEVEL': 'Mid Level',
      'SENIOR': 'Senior',
      'LEAD': 'Lead',
      'PRINCIPAL': 'Principal',
    };

    // Format education level
    const educationLevelLabels: Record<string, string> = {
      'NONE': 'None',
      'CERTIFICATE': 'Certificate',
      'DIPLOMA': 'Diploma',
      'BACHELORS': "Bachelor's Degree",
      'MASTERS': "Master's Degree",
      'PHD': 'PhD',
    };

    // Send notification to the job poster (creator)
    this.notificationBus.emit('job-posted-creator', {
      to: data.creatorEmail,
      creatorName: data.creatorName,
      jobTitle: data.title,
      jobId: data.jobId,
      jobExternalId: data.jobExternalId,
      jobUrl: data.jobUrl,
      dashboardUrl: data.dashboardUrl,
      location: data.isRemote ? 'Remote' : `${data.locationCity}${data.locationNeighborhood ? `, ${data.locationNeighborhood}` : ''}`,
      payInfo: payInfo,
      employmentType: employmentLabels[data.employmentType] || data.employmentType,
      paymentType: paymentTypeLabels[data.paymentType] || data.paymentType,
      workArrangement: workArrangementLabels[data.workArrangement] || data.workArrangement,
      commitment: commitmentLabels[data.commitment] || data.commitment,
      experienceLevel: experienceLevelLabels[data.experienceLevel] || data.experienceLevel,
      educationLevel: educationLevelLabels[data.educationLevel] || data.educationLevel,
      skills: data.skills.slice(0, 5).join(', '),
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline).toLocaleDateString() : 'Not specified',
      createdAt: new Date(data.createdAt).toLocaleString(),
      isAnonymous: data.isAnonymous,
      displayName: data.displayName,
      hoursPerWeek: data.hoursPerWeek ? `${data.hoursPerWeek} hours/week` : undefined,
    });

    // If account email exists and is different from creator, notify account owner
    if (data.accountEmail && data.accountEmail !== data.creatorEmail) {
      this.notificationBus.emit('job-posted-account', {
        to: data.accountEmail,
        accountName: data.accountName,
        creatorName: data.creatorName,
        jobTitle: data.title,
        jobId: data.jobId,
        jobExternalId: data.jobExternalId,
        dashboardUrl: data.dashboardUrl,
        createdAt: new Date(data.createdAt).toLocaleString(),
      });
    }

    this.logger.log(`Job posted notification sent to creator ${data.creatorEmail}`);
    console.log(`Job posted notification sent to creator ${data.creatorEmail}`);
  }

  // ============================================================
  // HANDLE JOB APPLICATION SUBMITTED NOTIFICATION
  // ============================================================

  private async handleJobApplicationSubmitted(data: JobApplicationSubmittedData): Promise<void> {
    this.logger.log(`Handling job.application.submitted for application ${data.applicationExternalId}`);
    console.log(`Handling job.application.submitted for application ${data.applicationExternalId}`);
    
    // Send notification to the employer
    this.notificationBus.emit('job-application-submitted-employer', {
      to: data.employerEmail,
      employerName: data.employerName,
      applicantName: data.applicantName,
      applicantEmail: data.applicantEmail,
      applicantPhone: data.applicantPhone,
      jobTitle: data.jobTitle,
      jobLocation: data.jobLocation,
      jobCategory: data.jobCategory,
      applicationId: data.applicationId,
      applicationExternalId: data.applicationExternalId,
      expectedPay: data.expectedPay ? `${data.expectedPay.toLocaleString()} KES` : 'Not specified',
      availabilityDate: data.availabilityDate ? new Date(data.availabilityDate).toLocaleDateString() : 'Not specified',
      availabilityNotes: data.availabilityNotes || 'No notes provided',
      hasRequiredEquipment: data.hasRequiredEquipment ? 'Yes' : 'No',
      applicationDate: new Date(data.applicationDate).toLocaleString(),
      applicationUrl: data.applicationUrl,
      dashboardUrl: data.dashboardUrl,
    });

    // Send confirmation to the applicant
    this.notificationBus.emit('job-application-submitted-applicant', {
      to: data.applicantEmail,
      applicantName: data.applicantName,
      jobTitle: data.jobTitle,
      jobLocation: data.jobLocation,
      employerName: data.employerName,
      applicationId: data.applicationId,
      applicationExternalId: data.applicationExternalId,
      expectedPay: data.expectedPay ? `${data.expectedPay.toLocaleString()} KES` : 'Not specified',
      applicationDate: new Date(data.applicationDate).toLocaleString(),
      applicationUrl: data.applicationUrl,
    });

    this.logger.log(`Job application submitted notifications sent to employer ${data.employerEmail} and applicant ${data.applicantEmail}`);
    console.log(`Job application submitted notifications sent to employer ${data.employerEmail} and applicant ${data.applicantEmail}`);
  }

  // ============================================================
  // HANDLE JOB APPLICATION STATUS CHANGED NOTIFICATION
  // ============================================================

  private async handleJobApplicationStatusChanged(data: JobApplicationStatusChangedData): Promise<void> {
    this.logger.log(`Handling job.application.status.changed for application ${data.applicationExternalId}`);
    console.log(`Handling job.application.status.changed for application ${data.applicationExternalId}`);
    
    const statusLabels: Record<string, string> = {
      'PENDING': 'Pending Review',
      'UNDER_REVIEW': 'Under Review',
      'SHORTLISTED': 'Shortlisted',
      'INTERVIEW': 'Interview Scheduled',
      'OFFERED': 'Offer Extended',
      'HIRED': 'Hired',
      'REJECTED': 'Rejected',
      'WITHDRAWN': 'Withdrawn',
    };

    const newStatusLabel = statusLabels[data.newStatus] || data.newStatus;
    const oldStatusLabel = statusLabels[data.oldStatus] || data.oldStatus;

    // Notify the applicant
    this.notificationBus.emit('job-application-status-changed-applicant', {
      to: data.applicantEmail,
      applicantName: data.applicantName,
      jobTitle: data.jobTitle,
      employerName: data.employerName,
      applicationId: data.applicationId,
      applicationExternalId: data.applicationExternalId,
      oldStatus: oldStatusLabel,
      newStatus: newStatusLabel,
      reason: data.reason || undefined,
      updatedAt: new Date(data.updatedAt).toLocaleString(),
      dashboardUrl: data.dashboardUrl,
    });

    // Notify the employer (if status changed to something they need to act on)
    if (['PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW'].includes(data.newStatus)) {
      this.notificationBus.emit('job-application-status-changed-employer', {
        to: data.employerEmail,
        employerName: data.employerName,
        applicantName: data.applicantName,
        jobTitle: data.jobTitle,
        applicationId: data.applicationId,
        applicationExternalId: data.applicationExternalId,
        oldStatus: oldStatusLabel,
        newStatus: newStatusLabel,
        reason: data.reason || undefined,
        updatedAt: new Date(data.updatedAt).toLocaleString(),
        dashboardUrl: data.dashboardUrl,
      });
    }

    // If status is HIRED or REJECTED, send additional notifications
    if (data.newStatus === 'HIRED') {
      this.notificationBus.emit('job-application-hired', {
        to: data.applicantEmail,
        applicantName: data.applicantName,
        jobTitle: data.jobTitle,
        employerName: data.employerName,
        employerEmail: data.employerEmail,
        applicationId: data.applicationId,
        applicationExternalId: data.applicationExternalId,
        dashboardUrl: data.dashboardUrl,
      });
    }

    if (data.newStatus === 'REJECTED') {
      this.notificationBus.emit('job-application-rejected', {
        to: data.applicantEmail,
        applicantName: data.applicantName,
        jobTitle: data.jobTitle,
        employerName: data.employerName,
        applicationId: data.applicationId,
        applicationExternalId: data.applicationExternalId,
        reason: data.reason || 'The employer decided not to proceed with your application.',
        dashboardUrl: data.dashboardUrl,
      });
    }

    this.logger.log(`Job application status changed notification sent to applicant ${data.applicantEmail}`);
    console.log(`Job application status changed notification sent to applicant ${data.applicantEmail}`);
  }

  // ============================================================
  // HANDLE JOB CLOSED NOTIFICATION
  // ============================================================

  private async handleJobClosed(data: JobClosedData): Promise<void> {
    this.logger.log(`Handling job.closed notification for job ${data.jobExternalId}`);
    console.log(`Handling job.closed notification for job ${data.jobExternalId}`);
    
    // Notify the job creator
    this.notificationBus.emit('job-closed-creator', {
      to: data.creatorEmail,
      creatorName: data.creatorName,
      jobTitle: data.title,
      jobId: data.jobId,
      jobExternalId: data.jobExternalId,
      closedAt: new Date(data.closedAt).toLocaleString(),
      totalApplications: data.totalApplications || 0,
      dashboardUrl: data.dashboardUrl,
    });

    // Notify the account owner (if different from creator)
    if (data.accountEmail && data.accountEmail !== data.creatorEmail) {
      this.notificationBus.emit('job-closed-account', {
        to: data.accountEmail,
        accountName: data.accountName,
        jobTitle: data.title,
        jobId: data.jobId,
        jobExternalId: data.jobExternalId,
        closedAt: new Date(data.closedAt).toLocaleString(),
        totalApplications: data.totalApplications || 0,
        dashboardUrl: data.dashboardUrl,
      });
    }

    this.logger.log(`Job closed notification sent to creator ${data.creatorEmail}`);
    console.log(`Job closed notification sent to creator ${data.creatorEmail}`);
  }

  // ============================================================
  // HANDLE JOB APPLICATION REMINDER NOTIFICATION
  // ============================================================

  private async handleJobApplicationReminder(data: JobApplicationReminderData): Promise<void> {
    this.logger.log(`Handling job.application.reminder for job ${data.jobPostId}`);
    console.log(`Handling job.application.reminder for job ${data.jobPostId}`);
    
    // Only send if there are pending applications
    if (data.pendingApplicationsCount === 0) {
      this.logger.log(`No pending applications for job ${data.jobPostId}, skipping reminder`);
      console.log(`No pending applications for job ${data.jobPostId}, skipping reminder`);
      return;
    }

    // Notify the employer about pending applications
    this.notificationBus.emit('job-application-reminder-employer', {
      to: data.employerEmail,
      employerName: data.employerName,
      jobTitle: data.jobTitle,
      jobLocation: data.jobLocation,
      jobId: data.jobPostId,
      pendingApplicationsCount: data.pendingApplicationsCount,
      applications: data.applications.slice(0, 5).map(app => ({
        applicantName: app.applicantName,
        applicantEmail: app.applicantEmail,
        appliedAt: new Date(app.appliedAt).toLocaleString(),
        expectedPay: app.expectedPay ? `${app.expectedPay.toLocaleString()} KES` : 'Not specified',
        availabilityDate: app.availabilityDate ? new Date(app.availabilityDate).toLocaleDateString() : 'Not specified',
      })),
      dashboardUrl: data.dashboardUrl,
    });

    this.logger.log(`Job application reminder sent to employer ${data.employerEmail} for ${data.pendingApplicationsCount} pending applications`);
    console.log(`Job application reminder sent to employer ${data.employerEmail} for ${data.pendingApplicationsCount} pending applications`);
  }
}