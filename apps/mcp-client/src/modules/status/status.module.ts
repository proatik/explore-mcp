import { Module } from '@nestjs/common';

import { StatusController } from '@/modules/status/status.controller';
import { ConnectionModule } from '@/modules/connection/connection.module';

@Module({
  imports: [ConnectionModule],
  controllers: [StatusController]
})
export class StatusModule {}
