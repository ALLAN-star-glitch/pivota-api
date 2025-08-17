import { Controller, Get, Version } from '@nestjs/common';

@Controller('health')
export class HealthController {

    @Version('1')
    @Get('check-health')
    healthv1(){
        return {
            status: 'ok'
        }
    }
}
