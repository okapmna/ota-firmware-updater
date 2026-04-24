FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create the storage directory
RUN mkdir -p firmware_storage

EXPOSE 3000

CMD ["node", "src/app.js"]
