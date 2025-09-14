import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make config available across all modules
      envFilePath: [`.env.${process.env.NODE || 'dev'}`], // Loads .env.dev or .env.prod depending on NODE_ENV
    }),

    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
