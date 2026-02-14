import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGatewayController } from './notifications-gateway.controller';
import { NotificationsGatewayService } from './notifications-gateway.service.spec';

describe('NotificationsGatewayController', () => {
  let controller: NotificationsGatewayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsGatewayController],
      providers: [
        {
          provide: NotificationsGatewayService,
          useValue: {
            sendSms: jest.fn(),
            sendBulkSms: jest.fn(),
            getActivities: jest.fn(),
            getSmsActivities: jest.fn(),
            getSmsRealtime: jest.fn(),
            getSmsHealth: jest.fn(),
            getStats: jest.fn(),
            getStatus: jest.fn(),
            getWsInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsGatewayController>(
      NotificationsGatewayController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
