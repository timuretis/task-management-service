import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

// Load balancer probes hit this often; a 429 here would mark a healthy target as down.
@SkipThrottle()
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
