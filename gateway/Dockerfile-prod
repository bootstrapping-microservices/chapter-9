FROM node:10.15.2-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY ./src ./src

CMD npx wait-port rabbit:5672 && \
    npm start