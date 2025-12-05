import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_PROTO_PATH } from '@pivota-api/protos';


@Module({
  imports: [
    ClientsModule.register([

        {
            name: 'CATEGORIES_PACKAGE',
            transport: Transport.GRPC,
            options: {
                url: process.env.LISTINGS_SERVICE_URL || 'localhost:50056',
                package: 'categories',
                protoPath: LISTINGS_PROTO_PATH,
            }

        }
    ])
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
