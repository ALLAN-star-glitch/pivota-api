import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { NotificationActivityService } from '../notifications/notification-activity.service';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service';

describe('EmailController', () => {
  let controller: EmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: {
            sendUserWelcomeEmail: jest.fn(),
            sendOrganizationWelcomeEmail: jest.fn(),
            sendLoginEmail: jest.fn(),
          },
        },
        {
          provide: NotificationActivityService,
          useValue: {
            record: jest.fn(),
          },
        },
        {
          provide: NotificationsRealtimeService,
          useValue: {
            publishActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
