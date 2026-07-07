# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine

FROM ${NODE_IMAGE} AS base

WORKDIR /app

COPY package.json package-lock.json ./

FROM base AS deps

RUN npm ci

FROM deps AS dev

COPY . .

EXPOSE 4200

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]

FROM deps AS build

ARG BUILD_CONFIGURATION=production
ARG APP_VERSION=dev

ENV APP_VERSION=$APP_VERSION

COPY . .

RUN node scripts/write-app-version.mjs \
 && npm run build -- --configuration ${BUILD_CONFIGURATION}

FROM ${NGINX_IMAGE} AS prod

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/kiosk-screen/browser /usr/share/nginx/html

EXPOSE 8080
