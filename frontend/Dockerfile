FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npm run build -- --configuration production

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/kiosk-screen/browser /usr/share/nginx/html

EXPOSE 8080
