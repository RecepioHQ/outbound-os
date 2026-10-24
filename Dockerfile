# Glama-compatible, dry-run-only inspection container.
# This image is NOT an authenticated production mail service.
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY chatgpt/package.json ./chatgpt/package.json
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    OUTBOUND_OS_LIVE_SEND=0 \
    OUTBOUND_OS_MCP_HOST=0.0.0.0 \
    OUTBOUND_OS_MCP_ALLOW_REMOTE=1 \
    OUTBOUND_OS_DATA_DIR=/tmp/outbound-os \
    PORT=8787
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node chatgpt ./chatgpt
COPY --from=dependencies --chown=node:node /app/chatgpt/node_modules ./chatgpt/node_modules
COPY --chown=node:node src ./src
RUN cd chatgpt && node -e "require.resolve('@modelcontextprotocol/sdk/server/mcp.js')"
USER node
EXPOSE 8787
CMD ["node", "chatgpt/mcp-server.mjs"]
