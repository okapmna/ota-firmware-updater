FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create the storage directory and set permissions
RUN mkdir -p firmware_storage && chown -R node:node firmware_storage

USER node

EXPOSE 3000

CMD ["node", "src/app.js"]
