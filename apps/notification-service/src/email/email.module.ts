import { Module } from '@nestjs/common';
// import { EmailService } from './email.service';
// import { EmailController } from './email.controller';
import { EmailClientService } from './services/core/email-client.service';
import { EmailTemplateService } from './services/templates/email-template.service';
import { AuthEmailService } from './services/handlers/auth-email.service';
import { OrganizationEmailService } from './services/handlers/organization-email.service';
import { PropertyEmailService } from './services/handlers/property-email.service';
import { PaymentEmailService } from './services/handlers/payment-email.service';
import { SecurityEmailService } from './services/handlers/security-email.service';
import { AuthEmailController } from './controllers/auth-email.controller';
import { OrganizationEmailController } from './controllers/organization-email.controller';
import { PropertyEmailController } from './controllers/property-email.controller';
import { PaymentEmailController } from './controllers/payment-email.controller';
import { SecurityEmailController } from './controllers/security-email.controller';

@Module({
  controllers: [
    // EmailController,
    AuthEmailController,
    OrganizationEmailController,
    PropertyEmailController,
    PaymentEmailController,
    SecurityEmailController,
  ],
  providers: [
    // EmailService,
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
    SecurityEmailService,],
})
export class EmailModule {}
