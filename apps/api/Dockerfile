FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.25.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @finovaiq/api build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
