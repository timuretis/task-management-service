import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { HealthService } from './health.service';

export interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

// Load balancer probes hit this often; a 429 here would mark a healthy target as down.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const databaseUp = await this.healthService.isDatabaseUp();
    // 503 tells a load balancer or deploy check that this instance cannot serve requests (D20).
    if (!databaseUp) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: databaseUp ? 'ok' : 'error',
      // Process uptime in whole seconds; easier to read than a float.
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
