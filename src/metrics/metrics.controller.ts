import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { MetricsService } from './metrics.service';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { Permission } from 'src/shared/constants/permissions';
import { GetUser } from 'src/auth/decorators/get-user.decorator';


@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('system')
  @RequirePermissions(Permission.SYSTEM_METRICS_READ)
  @ApiOperation({ summary: 'Get system-wide metrics (Admin only)' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getSystemMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('property')
  @RequirePermissions(Permission.SYSTEM_METRICS_READ)
  @ApiOperation({ summary: 'Get property engagement metrics' })
  @ApiQuery({ name: 'timeRange', enum: ['day', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Property metrics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getPropertyMetrics(
    @Query('timeRange') timeRange: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.metricsService.getPropertyMetrics(timeRange);
  }

  @Get('tenant')
  @RequirePermissions(Permission.SYSTEM_METRICS_READ)
  @ApiOperation({ summary: 'Get tenant-specific metrics' })
  @ApiResponse({ status: 200, description: 'Tenant metrics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getTenantMetrics(@GetUser() user: any) {
    const tenantId = user.tenantId || user.tenant?.toString();
    return this.metricsService.getTenantMetrics(tenantId);
  }
}