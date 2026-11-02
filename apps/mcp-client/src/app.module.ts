import { Module } from '@nestjs/common';

import { LlmModule } from '@/modules/llm/llm.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { StatusModule } from '@/modules/status/status.module';
import { AppConfigModule } from '@/core/config/config.module';

import type { DynamicModule } from '@nestjs/common';
import type { LlmProvider } from '@/modules/llm/llm.types';

@Module({})
export class AppModule {
  static forRoot(
    env: Record<string, unknown>,
    llm?: LlmProvider
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ChatModule,
        StatusModule,
        LlmModule.forRoot(llm),
        AppConfigModule.forRoot(env)
      ]
    };
  }
}
