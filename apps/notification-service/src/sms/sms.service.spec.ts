import { Test, TestingModule } from '@nestjs/testing';
import { SmsService, AfricastalkingSMS, SmsResponse } from './sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let service: SmsService;

  // Strongly typed mock SMS client
  const mockSmsClient: AfricastalkingSMS = {
    send: jest.fn(),
  };

  // Mock ConfigService
  const mockConfigService: Partial<ConfigService> = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'AT_USERNAME':
          return 'mockUsername';
        case 'AT_API_KEY':
          return 'mockApiKey';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'AFRICASTALKING_SMS',
          useValue: mockSmsClient,
        },
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

  it('should send SMS successfully', async () => {
    const mockResponse = { status: 'success', message: 'SMS sent' };
    (mockSmsClient.send as jest.Mock).mockResolvedValue(mockResponse);

    const result: SmsResponse = await service.sendSms('+254700000000', 'Test message');

    expect(result).toEqual({
      status: 'success',
      to: '+254700000000',
      message: 'Test message',
      data: mockResponse,
    });
    expect(mockSmsClient.send).toHaveBeenCalledWith({
      to: '+254700000000',
      message: 'Test message',
    });
  });

  it('should throw error if SMS sending fails', async () => {
    (mockSmsClient.send as jest.Mock).mockRejectedValue(new Error('Network Error'));

    await expect(service.sendSms('+254700000000', 'Test message')).rejects.toThrow(
      'SMS sending failed: Network Error',
    );
    expect(mockSmsClient.send).toHaveBeenCalledWith({
      to: '+254700000000',
      message: 'Test message',
    });
  });

  it('should throw BadRequestException for invalid phone number', async () => {
    await expect(service.sendSms('12345', 'Hello')).rejects.toThrow(
      'Phone number must be in E.164 format, e.g., +254700000000',
    );
  });

  it('should throw BadRequestException for message exceeding 160 chars', async () => {
    const longMessage = 'a'.repeat(161);
    await expect(service.sendSms('+254700000000', longMessage)).rejects.toThrow(
      'Message is required and must be <= 160 characters',
    );
  });
});
