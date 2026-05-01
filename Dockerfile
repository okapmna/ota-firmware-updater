FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create the storage directories
RUN mkdir -p firmware_storage/temp

EXPOSE 3000

CMD ["node", "src/app.js"]
