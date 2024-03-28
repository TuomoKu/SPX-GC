FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only production

COPY . ./
RUN mv ASSETS _ASSETS && \
    mv DATAROOT _DATAROOT && \
    mv kubernetes/*.sh ./ && \
    chmod +x *.sh

ENTRYPOINT ["/bin/sh", "-c"]
CMD [ "./start.sh" ]

VOLUME ["/usr/src/app/ASSETS", "/usr/src/app/DATAROOT", "/usr/src/app/LOGS"]

EXPOSE 5656