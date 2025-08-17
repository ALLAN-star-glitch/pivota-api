/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //config service 
  const configService = app.get(ConfigService)

  //Setting up the global prefix via the config service
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX');
  if(globalPrefix){
    app.setGlobalPrefix(globalPrefix)
  }

  //Enabling versioning
  app.enableVersioning({
    type: VersioningType.URI
  }
   )

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();



