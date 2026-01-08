/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { LISTINGS_CATEGORIES_PROTO_PATH, LISTINGS_HOUSING_PROTO_PATH, LISTINGS_JOBS_PROTO_PATH, PROVIDERS_PRICING_PROTO_PATH, PROVIDERS_PROTO_PATH} from '@pivota-api/protos';
import * as dotenv from 'dotenv'

// Load environment
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

async function bootstrap() {

  const logger = new Logger('ListingsServiceBootstrap')

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({

    transport: Transport.GRPC,
    options: {
      package: 'categories',
      protoPath: LISTINGS_CATEGORIES_PROTO_PATH,
      url: process.env.CATEGORIES_GRPC_URL || '0.0.0.0:50056'

    }
  });

  app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'jobs',
    protoPath: LISTINGS_JOBS_PROTO_PATH,
    url: process.env.JOBS_GRPC_URL || '0.0.0.0:50057', // separate port
  },
});

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'providers',
      protoPath: PROVIDERS_PROTO_PATH,
      url: process.env.PROVIDERS_GRPC_URL || '0.0.0.0:50058', // separate port
    },
  }); 

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'providers_pricing',
      protoPath: PROVIDERS_PRICING_PROTO_PATH,
      url: process.env.PROVIDERS_PRICING_GRPC_URL || '0.0.0.0:50059', // separate port
    },
  }); 

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'housing',
      protoPath: LISTINGS_HOUSING_PROTO_PATH,
      url: process.env.HOUSING_GRPC_URL || '0.0.0.0:50060'
    }
  })

await app.startAllMicroservices();

 logger.log(`🚀 Listings service is running`);

logger.log(
  `📦 Categories gRPC service listening on ${process.env.CATEGORIES_GRPC_URL || '0.0.0.0:50056'}`
);

logger.log(
  `📦 Jobs gRPC service listening on ${process.env.JOBS_GRPC_URL || '0.0.0.0:50057'}`
);

logger.log(
  `📨 Kafka connected to brokers: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`
);

}
  

bootstrap();
