FROM node:10.15.2-alpine

WORKDIR /usr/src/app
COPY package*.json ./

CMD npm config set cache-min 9999999 && \
    npm install && \
    npm run start:dev
    