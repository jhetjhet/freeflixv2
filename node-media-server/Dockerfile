FROM node:18.20.0-bullseye-slim

WORKDIR /app
COPY . /app

RUN npm install && npm install -g pm2

EXPOSE 8080