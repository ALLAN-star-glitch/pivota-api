// apps/notification-service/src/email/email.module.ts
import { Module, Logger } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { EmailClientService } from './services/core/email-client.service';
import { EmailTemplateService } from './services/templates/email-template.service';
import { AuthEmailService } from './services/handlers/auth-email.service';
import { OrganizationEmailService } from './services/handlers/organization-email.service';
import { PropertyEmailService } from './services/handlers/property-email.service';
import { PaymentEmailService } from './services/handlers/payment-email.service';
import { SecurityEmailService } from './services/handlers/security-email.service';

// Controllers
import { AuthEmailController } from './controllers/auth-email.controller';
import { OrganizationEmailController } from './controllers/organization-email.controller';
import { PropertyEmailController } from './controllers/property-email.controller';
import { PaymentEmailController } from './controllers/payment-email.controller';
import { SecurityEmailController } from './controllers/security-email.controller';

@Module({
  imports: [
    // Configure Mailer module - Provider agnostic (works with Mailjet, Resend, Postmark, etc.)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('MailerModule');
        
        // Log all email configuration being loaded
        logger.log('📧 ========== LOADING EMAIL CONFIGURATION ==========');
        
        const smtpHost = configService.get('SMTP_HOST');
        const smtpPort = configService.get('SMTP_PORT');
        const smtpSecure = configService.get('SMTP_SECURE', false);
        const smtpUser = configService.get('SMTP_USER');
        const smtpPass = configService.get('SMTP_PASS');
        const fromEmail = configService.get('MAIL_FROM_EMAIL');
        const fromName = configService.get('MAIL_FROM_NAME', 'PivotaConnect');
        const connectionTimeout = Number(configService.get('SMTP_CONNECTION_TIMEOUT', 30000));
        const greetingTimeout = Number(configService.get('SMTP_GREETING_TIMEOUT', 30000));
        const socketTimeout = Number(configService.get('SMTP_SOCKET_TIMEOUT', 30000));
        
        // Log each configuration value (mask sensitive data)
        logger.log(`📧 SMTP_HOST: ${smtpHost || '❌ NOT SET'}`);
        logger.log(`📧 SMTP_PORT: ${smtpPort || '❌ NOT SET'}`);
        logger.log(`📧 SMTP_SECURE: ${smtpSecure}`);
        logger.log(`📧 SMTP_USER: ${smtpUser ? (smtpUser.substring(0, 8) + '...' + smtpUser.substring(smtpUser.length - 4)) : '❌ NOT SET'}`);
        logger.log(`📧 SMTP_PASS: ${smtpPass ? '✅ SET (length: ' + smtpPass.length + ')' : '❌ NOT SET'}`);
        logger.log(`📧 MAIL_FROM_EMAIL: ${fromEmail || '❌ NOT SET'}`);
        logger.log(`📧 MAIL_FROM_NAME: ${fromName}`);
        logger.log(`📧 Connection Timeout: ${connectionTimeout}ms`);
        logger.log(`📧 Greeting Timeout: ${greetingTimeout}ms`);
        logger.log(`📧 Socket Timeout: ${socketTimeout}ms`);
        
        // Determine which provider is being used
        let provider = 'Unknown';
        if (smtpHost?.includes('mailjet')) provider = 'Mailjet';
        else if (smtpHost?.includes('resend')) provider = 'Resend';
        else if (smtpHost?.includes('postmarkapp')) provider = 'Postmark';
        else if (smtpHost?.includes('sendinblue')) provider = 'Brevo (Sendinblue)';
        else if (smtpHost?.includes('sendgrid')) provider = 'SendGrid';
        else if (smtpHost?.includes('amazonaws')) provider = 'Amazon SES';
        else if (smtpHost?.includes('mailgun')) provider = 'Mailgun';
        
        logger.log(`📧 Detected Provider: ${provider}`);
        
        // Validate required configuration
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
          logger.error('❌ Missing required SMTP configuration!');
          logger.error('   Please check your .env file for SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
        }
        
        if (!fromEmail) {
          logger.error('❌ Missing MAIL_FROM_EMAIL configuration!');
        }
        
        // Log the final transport configuration (masking password)
        logger.log('📧 Transport config being used:');
        logger.log(`   host: ${smtpHost}`);
        logger.log(`   port: ${smtpPort}`);
        logger.log(`   secure: ${smtpSecure}`);
        logger.log(`   auth: { user: ${smtpUser ? smtpUser.substring(0, 8) + '...' : 'null'}, pass: ${smtpPass ? '***' : 'null'} }`);
        
        logger.log('📧 ================================================');
        
        return {
          transport: {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            // ✅ CRITICAL: Timeouts to prevent hanging and unacked messages
            connectionTimeout: connectionTimeout,
            greetingTimeout: greetingTimeout,
            socketTimeout: socketTimeout,
          },
          defaults: {
            from: `"${fromName}" <${fromEmail}>`,
          },
        };
      },
    }),
  ],
  controllers: [
    AuthEmailController,
    OrganizationEmailController,
    PropertyEmailController,
    PaymentEmailController,
    SecurityEmailController,
  ],
  providers: [
    EmailClientService,
    EmailTemplateService,
    AuthEmailService,
    OrganizationEmailService,
    PropertyEmailService,
    PaymentEmailService,
    SecurityEmailService,
  ],
  exports: [
    EmailClientService,
    EmailTemplateService,
    AuthEmailService,
    OrganizationEmailService,
    PropertyEmailService,
    PaymentEmailService,
    SecurityEmailService,
  ],
})
export class EmailModule {}