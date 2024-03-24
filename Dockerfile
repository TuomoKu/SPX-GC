FROM node:18-slim

RUN apt-get update && apt-get install -y curl lsb-release gnupg

# Install gcsfuse.
RUN echo "deb https://packages.cloud.google.com/apt gcsfuse-$(lsb_release -c -s) main" | tee /etc/apt/sources.list.d/gcsfuse.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN apt-get update
RUN apt-get install -y fuse gcsfuse

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only production

COPY . ./
RUN chmod +x entrypoint.sh

ENTRYPOINT [ "./entrypoint.sh" ]

EXPOSE 5656