FROM node:20 AS build
WORKDIR /app

COPY web/package*.json /app/web/
RUN cd /app/web && npm ci

COPY web /app/web
RUN cd /app/web && npm run build -- --configuration production

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist/web/browser /usr/share/nginx/html
EXPOSE 80
