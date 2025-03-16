package com.stockplus.marketdata;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main application class for the Market Data Service.
 * This service generates random stock prices every 100ms and publishes them to Kafka.
 */
public class MarketDataServiceApplication {
    private static final Logger logger = LoggerFactory.getLogger(MarketDataServiceApplication.class);

    public static void main(String[] args) {
        logger.info("Starting Market Data Service...");
        
        try {
            // Display startup banner
            displayStartupBanner();
            
            // Create and start the Kafka producer
            logger.info("Initializing Kafka producer...");
            KafkaProducerService kafkaProducer = new KafkaProducerService();
            
            // Create the market data generator
            logger.info("Initializing market data generator...");
            MarketDataGenerator generator = new MarketDataGenerator();
            
            // Register shutdown hook to gracefully shut down the service
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                logger.info("Shutting down Market Data Service...");
                generator.stop();
                kafkaProducer.close();
                logger.info("Market Data Service stopped.");
            }));
            
            // Start the generator
            logger.info("Starting market data generation...");
            generator.start(kafkaProducer);
            
            logger.info("Market Data Service is running. Press Ctrl+C to stop.");
        } catch (Exception e) {
            logger.error("Error starting Market Data Service: {}", e.getMessage(), e);
            System.exit(1);
        }
    }
    
    /**
     * Displays a startup banner in the console.
     */
    private static void displayStartupBanner() {
        System.out.println("\n" +
                "╔═══════════════════════════════════════════════════════════╗\n" +
                "║                                                           ║\n" +
                "║   STOCKPLUS MARKET DATA SERVICE                           ║\n" +
                "║   Generating stock prices every 100ms                     ║\n" +
                "║                                                           ║\n" +
                "║   Stock symbols: AAPL, MSFT, GOOGL, AMZN, META,           ║\n" +
                "║                  TSLA, NVDA, JPM, V, WMT                  ║\n" +
                "║                                                           ║\n" +
                "╚═══════════════════════════════════════════════════════════╝\n");
    }
} 