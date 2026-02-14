// sms/sms-test-utils.ts
import { ConfigService } from '@nestjs/config';
import { AfricastalkingSMS, AFRICASTALKING_SMS } from '../sms.service';
import { TestingModule, Test } from '@nestjs/testing';

/**
 * Mock ConfigService with environment fallback
 */
export const mockConfigService: Partial<ConfigService> = {
  get: (key: string) => {
    if (key === 'AT_USERNAME') return 'mockUsername';
    if (key === 'AT_API_KEY') return 'envFallbackKey';
    return null;
  },
};

/**
 * Helper to create a fake provider response for a single recipient
 */
export const buildProviderResponse = (number: string) => ({
  SMSMessageData: {
    Message: 'Sent to 1/1',
    Recipients: [
      {
        status: 'Success',
        number,
        cost: 'KES 0.80',
        messageId: 'msg-123',
      },
    ],
  },
});

/**
 * Helper to create a fake provider response for multiple recipients
 */
export const buildBulkProviderResponse = (numbers: string[]) => ({
  SMSMessageData: {
    Message: `Sent to ${numbers.length}/${numbers.length}`,
    Recipients: numbers.map((number) => ({
      status: 'Success',
      number,
      cost: 'KES 0.80',
      messageId: `msg-${number}`,
    })),
  },
});

/**
 * Create a mocked AfricastalkingSMS client
 */
export const createMockSmsClient = (): AfricastalkingSMS => ({
  send: async ({ to }) => ({
    SMSMessageData: {
      Message: `Mocked send to ${to}`,
      Recipients: Array.isArray(to)
        ? to.map((num) => ({ status: 'Success', number: num, messageId: `msg-${num}`, cost: 'KES 0.80' }))
        : [{ status: 'Success', number: to, messageId: 'msg-123', cost: 'KES 0.80' }],
    },
  }),
});

/**
 * Generic function to create a NestJS testing module with SmsService
 * @param smsClient Optional mocked client to inject
 * @returns { service, smsClient, module }
 */
export const setupSmsServiceTest = async (
  smsClient?: AfricastalkingSMS,
) => {
  const client = smsClient || createMockSmsClient();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      require('../sms.service').SmsService,
      { provide: ConfigService, useValue: mockConfigService },
      { provide: AFRICASTALKING_SMS, useValue: client },
    ],
  }).compile();

  const service = module.get(require('../sms.service').SmsService);

  return { service, smsClient: client, module };
};

/**
 * Generic helper to assert that a function throws an error
 * Replaces Jest's `expect(...).rejects.toBeInstanceOf`
 *
 * Usage:
 *   await expectError(() => smsService.sendSms(...), Error);
 */
export const expectError = async (
  fn: () => Promise<unknown>,
  ErrorClass: new (...args: unknown[]) => unknown,
) => {
  try {
    await fn();
    throw new Error('Expected function to throw an error, but it did not');
  } catch (err) {
    if (!(err instanceof ErrorClass)) {
      throw new Error(`Expected error of type ${ErrorClass.name}, but got ${err.constructor.name}`);
    }
  }
};
