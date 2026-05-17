FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN npm ci

COPY . .

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run dashboard:build

FROM nginx:1.27-alpine AS runtime

COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

EXPOSE 80