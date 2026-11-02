import { NestFactory } from '@nestjs/core';

import { configureLogging } from '@woocommerce-mcp/shared';

import { AppModule } from '@/app.module';
import { MCP_PATH } from '@/core/http/http.constants';
import { EnvService } from '@/core/config/env.service';
import { NestLogger } from '@/core/logging/nest-logger';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RunningServer {
  url: string;
  mcpUrl: string;
  env: EnvService;
  close(): Promise<void>;
}

export async function startServer(
  envVars: Record<string, unknown> = process.env
): Promise<RunningServer> {
  const app = await NestFactory.create(AppModule.forRoot(envVars), {
    logger: new NestLogger()
  });
  const env = app.get(EnvService);

  configureLogging({ level: env.logLevel });

  await app.listen(env.port, env.host);

  const server = app.getHttpServer() as Server;
  const { port } = server.address() as AddressInfo;
  const host = env.host === '0.0.0.0' ? '127.0.0.1' : env.host;
  const url = `http://${host}:${port}`;

  return {
    url,
    mcpUrl: `${url}${MCP_PATH}`,
    env,
    close: async () => {
      // open subscription streams would otherwise keep the server alive.
      server.closeAllConnections();

      await app.close();
    }
  };
}
