import { Test, TestingModule } from '@nestjs/testing';
import { PropertyEmailController } from './property-email.controller';

describe('PropertyEmailController', () => {
  let controller: PropertyEmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyEmailController],
    }).compile();

    controller = module.get<PropertyEmailController>(PropertyEmailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
