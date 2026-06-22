import { Controller, Get } from "@nestjs/common";

@Controller('v1/health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'gateway',  // ← This is the GATEWAY service
      timestamp: new Date().toISOString(),
    };
  }
}