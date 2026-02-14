// sms/utils/index.ts
// Central export hub for SMS: service, module, controller, DTOs, and test/dev helpers

// -----------------------------
// Production / runtime exports
// -----------------------------

// Export main service, module, and controller
export { SmsService } from '../sms.service';
export { SmsModule } from '../sms.module';
export { SmsController } from '../sms.controller';

// Export DTOs for validation
export { SendSmsDto } from '../send-sms.dto';
export { SendBulkSmsDto } from '../send-bulk-sms.dto';

// -----------------------------
// Test / development helpers
// -----------------------------

// Export mocks and utilities to be used in unit/integration tests
export {
  mockConfigService,
  buildProviderResponse,
  buildBulkProviderResponse,
  createMockSmsClient,
  setupSmsServiceTest,
  
  expectError, // replaces Jest-specific expectBadRequest
} from './sms-test-utils';
