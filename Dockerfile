FROM node:18-slim

RUN apt-get update && apt-get install -y curl lsb-release gnupg

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only production

COPY . ./

CMD [ "node", "server.js"]

VOLUME ["/usr/src/app/ASSETS", "/usr/src/app/DATAROOT", "/usr/src/app/LOGS"]

EXPOSE 5656