import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGatewayService } from './notifications-gateway.service';

describe('NotificationsGatewayService', () => {
  let service: NotificationsGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGatewayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'NOTIFICATION_SERVICE_BASE_URL') {
                return 'http://localhost:3015';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsGatewayService>(
      NotificationsGatewayService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
