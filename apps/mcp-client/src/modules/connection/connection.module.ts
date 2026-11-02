import { Module } from '@nestjs/common';

import { RegistryService } from '@/modules/connection/registry.service';

@Module({
  providers: [RegistryService],
  exports: [RegistryService]
})
export class ConnectionModule {}
