import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { configureLogging } from '@woocommerce-mcp/shared';

import { AppModule } from '@/app.module';
import { EnvService } from '@/core/config/env.service';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { LlmProvider } from '@/modules/llm/llm.types';
import type { NestExpressApplication } from '@nestjs/platform-express';

export interface RunningClient {
  url: string;
  env: EnvService;
  close(): Promise<void>;
}

// public/ sits two levels above both src/bootstrap and dist/bootstrap.
const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

export async function startClient(
  envVars: Record<string, unknown> = process.env,
  llm?: LlmProvider
): Promise<RunningClient> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(envVars, llm),
    {
      logger: ['error', 'warn']
    }
  );

  const env = app.get(EnvService);

  configureLogging({ level: env.logLevel });

  app.useStaticAssets(PUBLIC_DIR);
  app.enableShutdownHooks();

  await app.listen(env.port, env.host);

  const server = app.getHttpServer() as Server;
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://${env.host}:${port}`,
    env,
    close: async () => {
      // open event streams would otherwise keep the server alive.
      server.closeAllConnections();

      await app.close();
    }
  };
}
