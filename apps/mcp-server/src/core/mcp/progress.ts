import type { ServerContext } from '@modelcontextprotocol/server';

export async function reportProgress(
  ctx: ServerContext,
  progress: number,
  total: number | undefined,
  message: string
): Promise<void> {
  const progressToken = ctx.mcpReq._meta?.progressToken;

  if (progressToken === undefined) return;

  await ctx.mcpReq.notify({
    method: 'notifications/progress',
    params: {
      progressToken,
      progress,
      ...(total === undefined ? {} : { total }),
      message
    }
  });
}
