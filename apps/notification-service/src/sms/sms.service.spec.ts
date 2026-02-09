import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;

  // Mock Africa's Talking SMS client
  const mockSmsClient = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: 'AFRICASTALKING_SMS',
          useValue: mockSmsClient,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    // Replace real sms client with mock
    (service as any).sms = mockSmsClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send SMS successfully', async () => {
    const mockResponse = { status: 'success', message: 'SMS sent' };
    mockSmsClient.send.mockResolvedValue(mockResponse);

    const result = await service.sendSms('+254700000000', 'Test message');

    expect(result).toEqual(mockResponse);
    expect(mockSmsClient.send).toHaveBeenCalledWith({
      to: '+254700000000',
      message: 'Test message',
    });
  });

  it('should throw error if SMS sending fails', async () => {
    mockSmsClient.send.mockRejectedValue(new Error('Network Error'));

    await expect(
      service.sendSms('+254700000000', 'Test message'),
    ).rejects.toThrow('Network Error');

    expect(mockSmsClient.send).toHaveBeenCalled();
  });
});
