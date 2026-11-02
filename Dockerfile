# Build once, then ship each app as its own small image.
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/mcp-server/package.json apps/mcp-server/
COPY apps/mcp-client/package.json apps/mcp-client/
COPY apps/woo-mock/package.json apps/woo-mock/
RUN pnpm install --frozen-lockfile
COPY packages ./packages
COPY apps/mcp-server ./apps/mcp-server
COPY apps/mcp-client ./apps/mcp-client
COPY apps/woo-mock ./apps/woo-mock
RUN pnpm build
RUN pnpm --filter woo-mock deploy --prod /deploy/woo-mock \
 && pnpm --filter mcp-server deploy --prod /deploy/mcp-server \
 && pnpm --filter mcp-client deploy --prod /deploy/mcp-client

FROM node:22-alpine AS runtime
WORKDIR /app
USER node
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]

FROM runtime AS woo-mock
COPY --from=build /deploy/woo-mock ./
EXPOSE 8080

FROM runtime AS mcp-server
COPY --from=build /deploy/mcp-server ./
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

FROM runtime AS mcp-client
COPY --from=build /deploy/mcp-client ./
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/api/status || exit 1
