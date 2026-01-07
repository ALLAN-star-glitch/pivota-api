import { Module } from '@nestjs/common';
import { OrganisationGatewayService } from './organisation-gateway.service';
import { OrganisationGatewayController } from './organisation-gateway.controller';

@Module({
  providers: [OrganisationGatewayService],
  controllers: [OrganisationGatewayController],
})
export class OrganisationGatewayModule {}
