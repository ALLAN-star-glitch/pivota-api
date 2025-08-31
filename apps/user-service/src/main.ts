/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as dotenv from 'dotenv';

dotenv.config({path: `.env.${process.env.NODE_ENV || 'dev'}`})

async function bootstrap() {

  //Log env file before app creation
  Logger.log(`NODE_ENV = ${process.env.NODE_ENV}`);
  Logger.log(`KAFKA_BROKERS = ${process.env.KAFKA_BROKERS}`);
 




  const app = await NestFactory.create(AppModule);


  //config service 
  const configService = app.get(ConfigService)

  //log values via config service
  Logger.log(`NODE_ENV (via configService) = ${configService.get<string>('NODE_ENV')}`);
  Logger.log(`KAFKA_BROKERS  =  ${configService.get<string>('KAFKA_BROKERS')}`);
  Logger.log(`DATABASE_URL  =  ${configService.get<string>('USER_SERVICE_DATABSE_URL')}`); // ✅ log DB URL


  //Setting up the global prefix via the config service
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX_USER_SERVICE');
  if(globalPrefix){
    app.setGlobalPrefix(globalPrefix)
  }

    // Kafka microservice setup
  const kafkaBrokers = configService.get<string>('KAFKA_BROKERS')?.split(',') || ['localhost:9092'];

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: kafkaBrokers },
      consumer: { groupId: 'user-service-consumer' },
    },
  });

  await app.startAllMicroservices();
  
  const port = configService.get<number>('USER_SERVICE_PORT') || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
