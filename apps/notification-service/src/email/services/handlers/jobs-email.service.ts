// apps/notification-service/src/email/services/jobs-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class JobsEmailService {
  private readonly logger = new Logger(JobsEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send job posted confirmation to creator
   */
  async sendJobPostedCreator(data: {
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
    contactEmail?: string;
    hoursPerWeek?: string;
    jobUrl?: string;
    dashboardUrl?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Job Posted Successfully!</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.creatorName},</p>
      <p>Your job posting <strong>${data.jobTitle}</strong> has been successfully published on PivotaConnect and is now live!</p>
      
      <div class="info-box">
        <h3>Job Summary</h3>
        <ul>
          <li><strong>Title:</strong> ${data.jobTitle}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Pay:</strong> ${data.payInfo}</li>
          <li><strong>Employment Type:</strong> ${data.employmentType}</li>
          <li><strong>Work Arrangement:</strong> ${data.workArrangement}</li>
          <li><strong>Commitment:</strong> ${data.commitment}</li>
          <li><strong>Experience Level:</strong> ${data.experienceLevel}</li>
          <li><strong>Education:</strong> ${data.educationLevel}</li>
          ${data.skills ? `<li><strong>Skills:</strong> ${data.skills}</li>` : ''}
          ${data.hoursPerWeek ? `<li><strong>Hours per Week:</strong> ${data.hoursPerWeek}</li>` : ''}
          <li><strong>Application Deadline:</strong> ${data.applicationDeadline}</li>
          <li><strong>Posted:</strong> ${data.createdAt}</li>
        </ul>
      </div>

      ${data.isAnonymous ? `
      <div class="info-box" style="border-color: #ff9800; background-color: #fff3e0;">
        <h3>Anonymous Posting</h3>
        <p>This job is posted anonymously. Your name and account details are hidden from applicants.</p>
        ${data.displayName ? `<p><strong>Display Name:</strong> ${data.displayName}</p>` : ''}
        ${data.contactEmail ? `<p><strong>Contact Email:</strong> ${data.contactEmail}</p>` : ''}
      </div>
      ` : ''}

      <div class="success-box">
        <p><strong>What's next?</strong></p>
        <p>Your job will be visible to thousands of job seekers on PivotaConnect.</p>
        <p>You will receive email notifications when candidates apply.</p>
        <p>Review applications promptly to find the best talent!</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/jobs/${data.jobExternalId}`}" class="button">View My Job</a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${data.jobUrl || `https://pivota.com/jobs/${data.jobExternalId}`}" style="color: ${this.template.getColors().textSecondary};">View Public Listing</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
        Need to make changes? You can edit or close this job anytime from your dashboard.
      </p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Job Posted: ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Job posted confirmation email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send job posted email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job posted notification to account owner (for organizations)
   */
  async sendJobPostedAccount(data: {
    to: string;
    accountName: string;
    creatorName: string;
    jobTitle: string;
    jobId: string;
    jobExternalId: string;
    createdAt: string;
    dashboardUrl?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>New Job Posted on Your Account</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.accountName},</p>
      <p>A new job posting has been created on your account.</p>
      
      <div class="info-box">
        <h3>Job Details</h3>
        <ul>
          <li><strong>Title:</strong> ${data.jobTitle}</li>
          <li><strong>Posted By:</strong> ${data.creatorName}</li>
          <li><strong>Posted:</strong> ${data.createdAt}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/jobs/${data.jobExternalId}`}" class="button">View Job</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `New Job Posted: ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Job posted account notification sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send job posted account email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job application submitted notification to employer
   */
  async sendJobApplicationSubmittedEmployer(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>New Job Application Received</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.employerName},</p>
      <p><strong>${data.applicantName}</strong> has applied to your job posting <strong>${data.jobTitle}</strong>.</p>
      
      <div class="info-box">
        <h3>Applicant Details</h3>
        <ul>
          <li><strong>Name:</strong> ${data.applicantName}</li>
          <li><strong>Email:</strong> ${data.applicantEmail}</li>
          ${data.applicantPhone ? `<li><strong>Phone:</strong> ${data.applicantPhone}</li>` : ''}
          ${data.expectedPay ? `<li><strong>Expected Pay:</strong> ${data.expectedPay}</li>` : ''}
          ${data.availabilityDate ? `<li><strong>Available From:</strong> ${data.availabilityDate}</li>` : ''}
          ${data.availabilityNotes ? `<li><strong>Availability Notes:</strong> ${data.availabilityNotes}</li>` : ''}
          ${data.hasRequiredEquipment ? `<li><strong>Has Required Equipment:</strong> ${data.hasRequiredEquipment}</li>` : ''}
          <li><strong>Applied:</strong> ${data.applicationDate}</li>
        </ul>
      </div>
      
      <div class="info-box" style="border-color: #4caf50; background-color: #e8f5e9;">
        <h3>Job Details</h3>
        <ul>
          <li><strong>Position:</strong> ${data.jobTitle}</li>
          <li><strong>Location:</strong> ${data.jobLocation}</li>
          <li><strong>Category:</strong> ${data.jobCategory}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/applications/${data.applicationExternalId}`}" class="button">Review Application</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
        Tip: Respond to applicants within 48 hours for the best candidate experience.
      </p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `New Application for ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Application submitted employer email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send application submitted employer email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job application submitted confirmation to applicant
   */
  async sendJobApplicationSubmittedApplicant(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Application Submitted Successfully</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.applicantName},</p>
      <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.employerName}</strong> has been successfully submitted!</p>
      
      <div class="info-box">
        <h3>Application Summary</h3>
        <ul>
          <li><strong>Position:</strong> ${data.jobTitle}</li>
          <li><strong>Location:</strong> ${data.jobLocation}</li>
          <li><strong>Employer:</strong> ${data.employerName}</li>
          ${data.expectedPay ? `<li><strong>Expected Pay:</strong> ${data.expectedPay}</li>` : ''}
          <li><strong>Applied:</strong> ${data.applicationDate}</li>
        </ul>
      </div>
      
      <div class="success-box">
        <p><strong>What's next?</strong></p>
        <p>The employer will review your application and reach out if you're selected for an interview.</p>
        <p>You can track the status of your application in your dashboard.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.applicationUrl || `https://pivota.com/dashboard/applications/${data.applicationExternalId}`}" class="button">View Application</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
        Good luck with your application!
      </p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Application Submitted: ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Application submitted applicant email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send application submitted applicant email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send application status changed notification to applicant
   */
  async sendJobApplicationStatusChangedApplicant(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    const statusColor = this.getStatusColor(data.newStatus);

    const content = `
      <h1>Application Status Updated</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.applicantName},</p>
      <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.employerName}</strong> has been updated.</p>
      
      <div class="info-box" style="border-color: ${statusColor};">
        <h3>Status Change</h3>
        <ul>
          <li><strong>Previous Status:</strong> ${data.oldStatus}</li>
          <li><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${data.newStatus}</span></li>
          ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
          <li><strong>Updated:</strong> ${data.updatedAt}</li>
        </ul>
      </div>
      
      ${data.newStatus === 'HIRED' ? `
      <div class="success-box" style="border-color: #4caf50; background-color: #e8f5e9;">
        <h3>Congratulations!</h3>
        <p>You've been hired for this position!</p>
        <p>The employer will contact you with next steps.</p>
      </div>
      ` : ''}
      
      ${data.newStatus === 'REJECTED' ? `
      <div class="info-box" style="border-color: #f44336; background-color: #ffebee;">
        <h3>Thank You for Your Interest</h3>
        <p>We appreciate your interest in this position.</p>
        <p>Keep applying to other opportunities on PivotaConnect!</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/applications/${data.applicationExternalId}`}" class="button">View Application</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Application Status: ${data.newStatus} - ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Application status changed applicant email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send application status changed applicant email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send application status changed notification to employer
   */
  async sendJobApplicationStatusChangedEmployer(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Application Status Updated</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.employerName},</p>
      <p>An application for <strong>${data.jobTitle}</strong> has been updated.</p>
      
      <div class="info-box">
        <h3>Status Change</h3>
        <ul>
          <li><strong>Applicant:</strong> ${data.applicantName}</li>
          <li><strong>Previous Status:</strong> ${data.oldStatus}</li>
          <li><strong>New Status:</strong> ${data.newStatus}</li>
          ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
          <li><strong>Updated:</strong> ${data.updatedAt}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/applications/${data.applicationExternalId}`}" class="button">View Application</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Application Updated: ${data.applicantName} - ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Application status changed employer email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send application status changed employer email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job closed notification to creator
   */
  async sendJobClosedCreator(data: {
    to: string;
    creatorName: string;
    jobTitle: string;
    jobId: string;
    jobExternalId: string;
    closedAt: string;
    totalApplications: number;
    dashboardUrl?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Job Closed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.creatorName},</p>
      <p>Your job posting <strong>${data.jobTitle}</strong> has been successfully closed.</p>
      
      <div class="info-box">
        <h3>Job Summary</h3>
        <ul>
          <li><strong>Title:</strong> ${data.jobTitle}</li>
          <li><strong>Closed:</strong> ${data.closedAt}</li>
          <li><strong>Total Applications:</strong> ${data.totalApplications}</li>
        </ul>
      </div>
      
      <div class="success-box">
        <p>Your job is no longer accepting applications.</p>
        <p>You can view and manage all applications from your dashboard.</p>
        <p>Need to reopen? You can create a new job posting anytime.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/jobs/${data.jobExternalId}`}" class="button">View Job</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Job Closed: ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Job closed creator email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send job closed creator email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job closed notification to account owner (for organizations)
   */
  async sendJobClosedAccount(data: {
    to: string;
    accountName: string;
    jobTitle: string;
    jobId: string;
    jobExternalId: string;
    closedAt: string;
    totalApplications: number;
    dashboardUrl?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Job Closed on Your Account</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.accountName},</p>
      <p>A job posting on your account has been closed.</p>
      
      <div class="info-box">
        <h3>Job Summary</h3>
        <ul>
          <li><strong>Title:</strong> ${data.jobTitle}</li>
          <li><strong>Closed:</strong> ${data.closedAt}</li>
          <li><strong>Total Applications:</strong> ${data.totalApplications}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/jobs/${data.jobExternalId}`}" class="button">View Job</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Job Closed: ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Job closed account email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send job closed account email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send job application reminder to employer
   */
  async sendJobApplicationReminderEmployer(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    let applicationsList = '';
    data.applications.forEach((app, index) => {
      applicationsList += `
        <div style="border-bottom: 1px solid #eee; padding: 12px 0; ${index === 0 ? 'padding-top: 0;' : ''}">
          <p style="margin: 4px 0;"><strong>${app.applicantName}</strong> - ${app.applicantEmail}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #666;">
            Applied: ${app.appliedAt}
            ${app.expectedPay ? ` | Expected: ${app.expectedPay}` : ''}
            ${app.availabilityDate ? ` | Available: ${app.availabilityDate}` : ''}
          </p>
        </div>
      `;
    });

    const content = `
      <h1>Pending Applications Reminder</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.employerName},</p>
      <p>You have <strong>${data.pendingApplicationsCount}</strong> pending application${data.pendingApplicationsCount > 1 ? 's' : ''} for <strong>${data.jobTitle}</strong> that need your attention.</p>
      
      <div class="info-box">
        <h3>Pending Applications</h3>
        ${applicationsList}
      </div>
      
      <div class="success-box">
        <p><strong>Don't keep candidates waiting!</strong></p>
        <p>Reviewing applications promptly helps you find the right talent faster.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `https://pivota.com/dashboard/jobs/${data.jobId}/applications`}" class="button">Review Applications</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Reminder: ${data.pendingApplicationsCount} Pending Application${data.pendingApplicationsCount > 1 ? 's' : ''} for ${data.jobTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Job application reminder email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send job application reminder email to ${data.to}: ${error.message}`);
      throw error;
    }
  } 

  /**
   * Get status color for email formatting
   */
  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'PENDING': '#ff9800',
      'UNDER_REVIEW': '#2196f3',
      'SHORTLISTED': '#4caf50',
      'INTERVIEW': '#9c27b0',
      'OFFERED': '#ff5722',
      'HIRED': '#4caf50',
      'REJECTED': '#f44336',
      'WITHDRAWN': '#9e9e9e',
    };
    return colors[status] || '#333';
  }
}