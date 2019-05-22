FROM node:lts-slim

ARG LISTEN_PORT=3000

ENV PROVISION_KEY your-provision-key-here
ENV KONG_ADMIN http://kong:8001
ENV KONG_API https://kong:8443
ENV API_PATH /mock
ENV SERVICE_HOST mockbin.org
ENV SCOPES {\"email\":\"Grant permissions to read your email address\",\"address\":\"Grant permissions to read your address information\",\"phone\":\"Grant permissions to read your mobile phone number\"}

RUN mkdir -p /usr/src/node

WORKDIR /usr/src/node

COPY . /usr/src/node

EXPOSE $LISTEN_PORT

RUN npm install

#运行命令
CMD ["node", "app.js","--no-daemon"]

