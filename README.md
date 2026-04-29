# ota-firmware-updater

Simple application for OTA firmware updates.

Features:
- Upload firmware
- Check firmware version
- Download firmware

## Setup Instructions

### Option 1: Running Locally

1. Copy the environment file:
   cp .env.example .env

2. Edit the `.env` file with your database configuration.

3. Install dependencies:
   npm install

4. Start the development server:
   npm run dev

### Option 2: Running with Docker

1. Copy the environment file:
   cp .env.example .env

2. Edit the `.env` file with your database configuration.

3. Start the application:
   docker compose up -d

## Main Endpoints

- POST /api/upload - Upload new firmware
- GET /api/ota/check - Check for firmware updates
