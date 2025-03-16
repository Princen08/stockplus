# StockPlus Market Data Service

A Java service that generates random stock price data every 100ms (10th of a second) and publishes it to Kafka for consumption by other services.

## Features

- Generates random stock price data for 10 popular stocks
- Updates prices every 100ms (10 times per second)
- Publishes data to Kafka in JSON format
- Configurable via properties
- Graceful shutdown handling
- Terminal display with color-coded price changes

## Prerequisites

- Java 17 or higher
- Apache Kafka (running on localhost:9092 by default)
- Maven

## Building the Service

```bash
cd market_data_service
mvn clean package
```

This will create a JAR file with all dependencies in the `target` directory.

## Running the Service

```bash
java -jar target/market-data-service-1.0-SNAPSHOT-jar-with-dependencies.jar
```

## Configuration

The service uses the following default configuration:

- Kafka bootstrap servers: `localhost:9092`
- Kafka topic: `stock-prices`
- Data generation interval: 100ms (10 times per second)

You can modify these settings in the source code if needed.

## Data Format

The service publishes stock price data in the following JSON format:

```json
{
  "symbol": "AAPL",
  "price": 180.25,
  "change": 0.75,
  "percentChange": 0.0042,
  "volume": 5432,
  "timestamp": "2023-07-21T15:30:45.123Z"
}
```

## Stock Symbols

The service generates data for the following stock symbols:

- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Google)
- AMZN (Amazon)
- META (Meta/Facebook)
- TSLA (Tesla)
- NVDA (NVIDIA)
- JPM (JPMorgan Chase)
- V (Visa)
- WMT (Walmart)

## Consuming the Data

Other services can consume the stock price data by subscribing to the `stock-prices` Kafka topic. 