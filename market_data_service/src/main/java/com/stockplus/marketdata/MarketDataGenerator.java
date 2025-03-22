package com.stockplus.marketdata;

import com.stockplus.marketdata.model.StockPrice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Generates random stock prices for a set of predefined stock symbols.
 */
public class MarketDataGenerator {
    private static final Logger logger = LoggerFactory.getLogger(MarketDataGenerator.class);
    
    // Get configuration from environment variables or use defaults
    private final long intervalMs;
    private final double volatility;
    
    // Stock symbols and their base prices
    private final Map<String, Double> stockBaseValues = new HashMap<>();
    
    // Thread pool for scheduling price updates
    private ScheduledExecutorService executorService;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final Random random = new Random();
    
    public MarketDataGenerator() {
        // Read from environment variables with defaults
        String envInterval = System.getenv("DATA_GENERATION_INTERVAL_MS");
        this.intervalMs = envInterval != null ? Long.parseLong(envInterval) : 100;
        
        String envVolatility = System.getenv("STOCK_VOLATILITY");
        this.volatility = envVolatility != null ? Double.parseDouble(envVolatility) : 0.002;
        
        // Initialize base values for stock symbols
        initializeStocks();
        
        logger.info("Market data generator initialized with interval: {}ms, volatility: {}", 
                intervalMs, volatility);
        logger.info("Monitoring {} stock symbols", stockBaseValues.size());
    }
    
    /**
     * Initializes the base values for the stock symbols.
     */
    private void initializeStocks() {
        // Technology stocks
        stockBaseValues.put("AAPL", 175.50);  // Apple
        stockBaseValues.put("MSFT", 380.20);  // Microsoft
        stockBaseValues.put("GOOGL", 145.80); // Alphabet (Google)
        stockBaseValues.put("AMZN", 180.30);  // Amazon
        stockBaseValues.put("META", 485.10);  // Meta (Facebook)
        
        // Other major stocks
        stockBaseValues.put("TSLA", 175.20);  // Tesla
        stockBaseValues.put("NVDA", 880.60);  // NVIDIA
        stockBaseValues.put("JPM", 190.40);   // JPMorgan Chase
        stockBaseValues.put("V", 275.90);     // Visa
        stockBaseValues.put("WMT", 60.30);    // Walmart
    }
    
    /**
     * Starts generating stock prices.
     *
     * @param kafkaProducer the Kafka producer to send prices to
     */
    public void start(KafkaProducerService kafkaProducer) {
        if (running.compareAndSet(false, true)) {
            logger.info("Starting market data generation at interval of {}ms", intervalMs);
            
            executorService = Executors.newSingleThreadScheduledExecutor();
            executorService.scheduleAtFixedRate(() -> {
                try {
                    generateAndSendPrices(kafkaProducer);
                } catch (Exception e) {
                    logger.error("Error generating prices: {}", e.getMessage(), e);
                }
            }, 0, intervalMs, TimeUnit.MILLISECONDS);
        } else {
            logger.warn("Market data generator is already running");
        }
    }
    
    /**
     * Stops generating stock prices.
     */
    public void stop() {
        if (running.compareAndSet(true, false)) {
            logger.info("Stopping market data generation");
            
            if (executorService != null) {
                executorService.shutdown();
                try {
                    if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                        executorService.shutdownNow();
                    }
                } catch (InterruptedException e) {
                    executorService.shutdownNow();
                    Thread.currentThread().interrupt();
                }
            }
        } else {
            logger.warn("Market data generator is not running");
        }
    }
    
    /**
     * Generates random prices for all stocks and sends them to Kafka.
     *
     * @param kafkaProducer the Kafka producer to send prices to
     */
    private void generateAndSendPrices(KafkaProducerService kafkaProducer) {
        Instant now = Instant.now();
        
        stockBaseValues.forEach((symbol, basePrice) -> {
            // Generate a random price fluctuation
            double change = basePrice * volatility * (random.nextDouble() * 2 - 1);
            double newPrice = basePrice + change;
            
            // Update the base price for the next iteration
            stockBaseValues.put(symbol, newPrice);
            
            // Create a stock price object
            StockPrice stockPrice = new StockPrice(
                    symbol,
                    roundToTwoDecimals(newPrice),
                    roundToTwoDecimals(change),
                    roundToTwoDecimals(change / basePrice * 100), // percent change
                    1000 + random.nextInt(9000), // random volume between 1000-10000
                    now
            );
            
            // Send to Kafka
            kafkaProducer.sendStockPrice(stockPrice);
        });
    }
    
    /**
     * Rounds a double to two decimal places.
     *
     * @param value the value to round
     * @return the rounded value
     */
    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
} 