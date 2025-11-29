FROM node:14-alpine

WORKDIR /app
COPY . /app

RUN npm install && npm install -g pm2

COPY start.sh .

CMD ["sh", "start.sh"]

EXPOSE 8080