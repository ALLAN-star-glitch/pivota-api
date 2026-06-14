import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { 
  LISTINGS_CATEGORIES_PROTO_PATH, 
  LISTINGS_HOUSING_PROTO_PATH, 
  LISTINGS_JOBS_PROTO_PATH, 
  CONTRACTORS_PRICING_PROTO_PATH, 
  CONTRACTORS_PROTO_PATH,
  LISTINGS_REGISTRY_PROTO_PATH,
  BOOKING_PROTO_PATH,
  SERVICE_EXECUTION_PROTO_PATH,
  SERVICE_EXECUTION_MEDIA_PROTO_PATH,
  CUSTOMER_CONFIRMATION_PROTO_PATH
} from '@pivota-api/protos';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {
  const logger = new Logger('ListingsServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Categories Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'categories',
      protoPath: LISTINGS_CATEGORIES_PROTO_PATH,
      url: process.env.CATEGORIES_GRPC_URL || '0.0.0.0:50056'
    }
  });

  // 2. Jobs Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'jobs',
      protoPath: LISTINGS_JOBS_PROTO_PATH,
      url: process.env.JOBS_GRPC_URL || '0.0.0.0:50057',
    },
  });

  // 3. Shared Listings Registry
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'listings_registry',
      protoPath: LISTINGS_REGISTRY_PROTO_PATH,
      url: process.env.LISTINGS_SHARED_GRPC_URL || '0.0.0.0:50058', 
    },
  });

  // 4. Contractors Pricing
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors_pricing',
      protoPath: CONTRACTORS_PRICING_PROTO_PATH,
      url: process.env.PROVIDERS_PRICING_GRPC_URL || '0.0.0.0:50059',
    },
  }); 

  // 5. Housing Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'housing',
      protoPath: LISTINGS_HOUSING_PROTO_PATH,
      url: process.env.HOUSING_GRPC_URL || '0.0.0.0:50060'
    }
  });

  // 6. Contractors Service (Service Offerings)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors',
      protoPath: CONTRACTORS_PROTO_PATH,
      url: process.env.PROVIDERS_GRPC_URL || '0.0.0.0:50061',
    },
  });

  // 7. Booking Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors_booking',
      protoPath: BOOKING_PROTO_PATH,
      url: process.env.BOOKING_GRPC_URL || '0.0.0.0:50063',
    },
  });

  // 8. Service Execution Service (StartWork, CompleteWork, GetWorkStatus, CheckAutoReleaseEligible)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors_service_execution',
      protoPath: SERVICE_EXECUTION_PROTO_PATH,
      url: process.env.SERVICE_EXECUTION_GRPC_URL || '0.0.0.0:50064',
    },
  });

  // 9. Service Execution Media Service (UploadEvidenceFiles)
  app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'contractors_service_execution_media',
    protoPath: SERVICE_EXECUTION_MEDIA_PROTO_PATH,
    url: process.env.SERVICE_EXECUTION_MEDIA_GRPC_URL || '0.0.0.0:50065',
  },
});

// 10. Customer Confirmation Service (ConfirmSatisfaction, ReportDissatisfaction)
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'contractors_customer_confirmation',
    protoPath: CUSTOMER_CONFIRMATION_PROTO_PATH,
    url: process.env.CUSTOMER_CONFIRMATION_GRPC_URL || '0.0.0.0:50066',
  },
});

  await app.startAllMicroservices();

  logger.log(`🚀 Listings microservice system is running`);
  
  const services = [
    { name: 'Categories', port: '50056' },
    { name: 'Jobs', port: '50057' },
    { name: 'Shared Registry', port: '50058' },
    { name: 'Contractors Pricing', port: '50059' },
    { name: 'Housing', port: '50060' },
    { name: 'Contractors (Service Offerings)', port: '50061' },
    { name: 'Booking', port: '50063' },
    { name: 'Service Execution', port: '50064' },
    { name: 'Service Execution Media', port: '50065' },
      { name: 'Customer Confirmation', port: '50066' },
  ];
  
  services.forEach(s => {
    logger.log(`📦 ${s.name} gRPC listening on port ${s.port}`);
  });
}

bootstrap();