FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY angular.json tsconfig*.json ./
COPY src ./src
# Build the source locale (es-ES) and the additional locale (en-US).
# Each Angular CLI build emits its own <base href> under
# /es/ or /en/, so nginx can serve both bundles under their prefixes.
RUN npm run build -- --configuration production
RUN npm run build -- --configuration en-US

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Each Angular CLI localized build emits its bundle under a locale-coded
# subfolder: dist/<app>/browser/<locale>/index.html. nginx maps the URL
# prefix /es-ES/ to that folder and /en-US/ to the en-US equivalent.
COPY --from=build /app/dist/kiosk-screen/browser/es-ES      /usr/share/nginx/html/es-ES
COPY --from=build /app/dist/kiosk-screen-en/browser/en-US   /usr/share/nginx/html/en-US

EXPOSE 8080
