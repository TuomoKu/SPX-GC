FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only production

COPY . ./

CMD ["node", "server.js"]

EXPOSE 5656