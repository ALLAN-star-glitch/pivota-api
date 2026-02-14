import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SmsService,
  AfricastalkingSMS,
  SmsResponse,
  BulkSmsResponse,
  AFRICASTALKING_SMS,
} from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let smsClient: jest.Mocked<AfricastalkingSMS>;

  // Mock ConfigService with env fallback
  const mockConfigService: Partial<ConfigService> = {
    get: jest.fn((key: string) => {
      if (key === 'AT_USERNAME') return 'mockUsername';
      if (key === 'AT_API_KEY') return 'envFallbackKey';
      return null;
    }),
  };

  // Mock provider response
  const buildProviderResponse = (number: string) => ({
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

  beforeEach(async () => {
    smsClient = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AFRICASTALKING_SMS, useValue: smsClient },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------- SINGLE SMS ----------

  it('should send SMS using client token when provided', async () => {
    const to = '+254700000000';
    const token = 'client-token-123';

    smsClient.send.mockResolvedValue(buildProviderResponse(to));

    const result: SmsResponse = await service.sendSms(to, 'Hello', token);

    expect(result.status).toBe('success');
    expect(result.to).toBe(to);
    expect(smsClient.send).toHaveBeenCalledWith({ to, message: 'Hello' });
  });

  it('should fallback to env token when client token missing', async () => {
    const to = '+254700000000';

    smsClient.send.mockResolvedValue(buildProviderResponse(to));

    const result = await service.sendSms(to, 'Hello');

    expect(result.status).toBe('success');
    expect(smsClient.send).toHaveBeenCalledWith({ to, message: 'Hello' });
  });

  it('should throw if provider fails', async () => {
    smsClient.send.mockRejectedValue(new Error('Provider unreachable'));

    await expect(service.sendSms('+254700000000', 'Hello')).rejects.toThrow(
      'SMS sending failed',
    );

    expect(smsClient.send).toHaveBeenCalledWith({ to: '+254700000000', message: 'Hello' });
  });

  it('should validate phone format', async () => {
    await expect(service.sendSms('0700000000', 'Hi')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should validate message length', async () => {
    const longMsg = 'x'.repeat(161);
    await expect(service.sendSms('+254700000000', longMsg)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // ---------- BULK SMS ----------

  it('should send bulk SMS successfully', async () => {
    smsClient.send.mockImplementation(async ({ to }) =>
      buildProviderResponse(to as string),
    );

    const result: BulkSmsResponse = await service.sendBulkSms(
      ['+254700000001', '+254700000002'],
      'Bulk message',
    );

    expect(result.status).toBe('success');
    expect(result.sentCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(smsClient.send).toHaveBeenCalledTimes(2);
  });

  it('should return partial_success when one fails', async () => {
    smsClient.send
      .mockResolvedValueOnce(buildProviderResponse('+254700000001'))
      .mockRejectedValueOnce(new Error('Gateway timeout'));

    const result: BulkSmsResponse = await service.sendBulkSms(
      ['+254700000001', '+254700000002'],
      'Bulk message',
    );

    expect(result.status).toBe('partial_success');
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.results[1].error).toContain('Gateway timeout');
  });

  it('should stop early when stopOnError=true', async () => {
    smsClient.send
      .mockResolvedValueOnce(buildProviderResponse('+254700000001'))
      .mockRejectedValueOnce(new Error('Provider down'));

    const result: BulkSmsResponse = await service.sendBulkSms(
      ['+254700000001', '+254700000002', '+254700000003'],
      'Bulk message',
      true,
    );

    expect(result.results.length).toBe(2); // stops after first failure
    expect(result.failedCount).toBe(1);
  });

  // ---------- HEALTH CHECK ----------

  it('should return provider health', () => {
    const health = service.getProviderHealth();
    expect(health.provider).toContain('africastalking');
    expect(health.configured).toBeTruthy();
    expect(health.username).toBe('mockUsername');
  });
});
