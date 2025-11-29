FROM python:3.9-slim

WORKDIR /app
COPY . /app
COPY start.sh /app/start.sh

RUN apt-get update && apt-get install -y pkg-config python3-dev default-libmysqlclient-dev build-essential && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

CMD ["sh", "start.sh"]

EXPOSE 8000