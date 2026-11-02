import { Global, Module } from '@nestjs/common';

import { EnvService } from '@/core/config/env.service';
import { LLM_PROVIDER } from '@/modules/llm/llm.constants';
import { OpenAIProvider } from '@/modules/llm/openai-provider';

import type { DynamicModule } from '@nestjs/common';
import type { LlmProvider } from '@/modules/llm/llm.types';

// no key means no model: the page still connects and shows the catalog.
@Global()
@Module({})
export class LlmModule {
  static forRoot(override?: LlmProvider): DynamicModule {
    const provider = override
      ? { provide: LLM_PROVIDER, useValue: override }
      : {
          provide: LLM_PROVIDER,
          inject: [EnvService],
          useFactory: ({ openai }: EnvService): LlmProvider | null =>
            openai.apiKey
              ? new OpenAIProvider({
                  apiKey: openai.apiKey,
                  model: openai.model,
                  baseUrl: openai.baseUrl
                })
              : null
        };

    return {
      module: LlmModule,
      providers: [provider],
      exports: [LLM_PROVIDER]
    };
  }
}
