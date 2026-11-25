import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      // Process uptime in whole seconds; easier to read than a float.
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
