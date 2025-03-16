const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Kafka } = require('kafkajs');
const path = require('path');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'dist/stock-plus-ui')));

// Kafka configuration
const kafka = new Kafka({
  clientId: 'stock-plus-ui',
  brokers: ['localhost:9092']
});

// Create a Kafka consumer
const consumer = kafka.consumer({ groupId: 'stock-plus-ui-group' });

// In-memory cache for historical data
const historicalData = {};
const MAX_HISTORICAL_ITEMS = 50;

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle request for historical data
  socket.on('get-historical', (symbol) => {
    console.log(`Historical data requested for ${symbol}`);
    if (historicalData[symbol]) {
      socket.emit('historical-data', historicalData[symbol]);
    } else {
      socket.emit('historical-data', []);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Connect to Kafka and subscribe to the stock-prices topic
async function startKafkaConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'stock-prices', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const stockPrice = JSON.parse(message.value.toString());
          console.log(`Received stock price: ${stockPrice.symbol} - $${stockPrice.price}`);

          // Store in historical data
          if (!historicalData[stockPrice.symbol]) {
            historicalData[stockPrice.symbol] = [];
          }
          
          historicalData[stockPrice.symbol].push(stockPrice);
          
          // Limit the size of historical data
          if (historicalData[stockPrice.symbol].length > MAX_HISTORICAL_ITEMS) {
            historicalData[stockPrice.symbol].shift();
          }

          // Broadcast to all connected clients
          io.emit('stock-price', stockPrice);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });

    console.log('Kafka consumer started');
  } catch (error) {
    console.error('Error starting Kafka consumer:', error);
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startKafkaConsumer().catch(console.error);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await consumer.disconnect();
  process.exit(0);
}); 