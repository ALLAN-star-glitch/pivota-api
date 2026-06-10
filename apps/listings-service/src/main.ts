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
  BOOKING_PROTO_PATH,  // Add this import
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

  // 6. Contractors Service
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors',
      protoPath: CONTRACTORS_PROTO_PATH,
      url: process.env.PROVIDERS_GRPC_URL || '0.0.0.0:50061',
    },
  });

  // 7. Booking Service - ADD THIS
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'contractors_booking',  // Must match the package name in your booking.proto
      protoPath: BOOKING_PROTO_PATH,
      url: process.env.BOOKING_GRPC_URL || '0.0.0.0:50063',  // Must match gateway port
    },
  });

  await app.startAllMicroservices();

  logger.log(`🚀 Listings microservice system is running`);
  
  const services = [
    { name: 'Categories', url: '50056' },
    { name: 'Jobs', url: '50057' },
    { name: 'Shared Registry', url: '50058' },
    { name: 'Contractors Pricing', url: '50059' },
    { name: 'Housing', url: '50060' },
    { name: 'Contractors', url: '50061' },
    { name: 'Booking', url: '50062' },  // Add this
  ];
  
  services.forEach(s => {
    logger.log(`📦 ${s.name} gRPC listening on port ${s.url}`);
  });
}

bootstrap();