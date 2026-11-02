import { Module } from '@nestjs/common';

import { StoreService } from '@/modules/store/store.service';
import { StoreResources } from '@/modules/store/store.resources';

@Module({
  providers: [StoreService, StoreResources],
  exports: [StoreResources]
})
export class StoreModule {}
