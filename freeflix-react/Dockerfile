FROM node:14-alpine AS build

WORKDIR /app
COPY . /app

RUN npm install
RUN npm run build

EXPOSE 3000

FROM nginx:alpine AS production

WORKDIR /app
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80