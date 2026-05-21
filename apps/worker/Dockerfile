FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace=packages/shared-types && npm run worker:build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker/dist ./dist

CMD ["node", "dist/main.js"]