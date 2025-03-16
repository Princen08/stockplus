# StockPlus UI

A real-time stock market data visualization application built with Angular, Tailwind CSS, Socket.IO, and Kafka.

## Features

- Real-time stock price updates from Kafka
- Responsive UI built with Angular and Tailwind CSS
- Interactive stock price charts
- Detailed view for individual stocks
- Served through Nginx for production deployment

## Prerequisites

- Node.js 18 or higher
- Angular CLI
- Docker and Docker Compose (for production deployment)
- Kafka (running locally or in Docker)

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Start the Angular development server:

```bash
ng serve
```

3. In a separate terminal, start the Node.js server:

```bash
node server.js
```

4. Make sure Kafka is running and the `market_data_service` is publishing data to the `stock-prices` topic.

5. Open your browser and navigate to `http://localhost:4200`.

## Production Deployment with Docker

1. Build and run the entire stack using Docker Compose:

```bash
docker-compose up -d
```

2. Open your browser and navigate to `http://localhost`.

## Project Structure

- `src/app/components/dashboard`: Main dashboard component showing all stock prices
- `src/app/components/stock-detail`: Detailed view for individual stocks with charts
- `src/app/services/socket.service.ts`: Service for Socket.IO communication
- `server.js`: Node.js server that bridges Kafka and Socket.IO
- `nginx.conf`: Nginx configuration for serving the Angular app
- `Dockerfile`: Multi-stage Dockerfile for building and serving the application
- `docker-compose.yml`: Docker Compose configuration for running the entire stack

## Technologies Used

- **Frontend**: Angular, Tailwind CSS, Chart.js
- **Backend**: Node.js, Express, Socket.IO
- **Message Broker**: Apache Kafka
- **Web Server**: Nginx
- **Containerization**: Docker, Docker Compose
