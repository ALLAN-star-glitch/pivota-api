import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { PrismaService } from '../prisma/prisma.service';


@Module({
    imports: [
    ], 
    controllers: [RbacController],    
    providers: [RbacService, PrismaService],    
    exports: [RbacService ],    
})
export class RbacModule {
}
