FROM node:18.20.0-bullseye-slim AS build

WORKDIR /app
COPY . /app

RUN npm install
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

EXPOSE 3000

FROM nginx:alpine AS production

WORKDIR /app
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80