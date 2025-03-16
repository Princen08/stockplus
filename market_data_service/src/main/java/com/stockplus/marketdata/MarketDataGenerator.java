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
 * Generates random stock price data every 100ms and sends it to Kafka.
 */
public class MarketDataGenerator {
    private static final Logger logger = LoggerFactory.getLogger(MarketDataGenerator.class);
    private static final long GENERATION_INTERVAL_MS = 100; // 10th of a second
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault());
    
    // List of stock symbols to generate data for
    private static final List<String> STOCK_SYMBOLS = Arrays.asList(
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V", "WMT"
    );
    
    // Initial prices for each stock
    private final Map<String, Double> lastPrices = new HashMap<>();
    
    private final Random random = new Random();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ScheduledExecutorService executorService;
    
    /**
     * Initializes the generator with initial stock prices.
     */
    public MarketDataGenerator() {
        // Initialize with some reasonable starting prices
        lastPrices.put("AAPL", 180.0);
        lastPrices.put("MSFT", 350.0);
        lastPrices.put("GOOGL", 140.0);
        lastPrices.put("AMZN", 170.0);
        lastPrices.put("META", 450.0);
        lastPrices.put("TSLA", 200.0);
        lastPrices.put("NVDA", 800.0);
        lastPrices.put("JPM", 180.0);
        lastPrices.put("V", 270.0);
        lastPrices.put("WMT", 60.0);
    }
    
    /**
     * Starts the market data generator.
     *
     * @param kafkaProducer the Kafka producer to send data to
     */
    public void start(KafkaProducerService kafkaProducer) {
        if (running.compareAndSet(false, true)) {
            logger.info("Starting market data generator with interval: {}ms", GENERATION_INTERVAL_MS);
            
            executorService = Executors.newSingleThreadScheduledExecutor();
            executorService.scheduleAtFixedRate(() -> {
                try {
                    // Generate and send stock prices for all symbols
                    for (String symbol : STOCK_SYMBOLS) {
                        StockPrice stockPrice = generateStockPrice(symbol);
                        kafkaProducer.sendStockPrice(stockPrice);
                        
                        // Log the stock price update to the terminal
                        logStockPriceUpdate(stockPrice);
                        
                        // Update the last price for this symbol
                        lastPrices.put(symbol, stockPrice.getPrice());
                    }
                } catch (Exception e) {
                    logger.error("Error generating or sending stock price: {}", e.getMessage(), e);
                }
            }, 0, GENERATION_INTERVAL_MS, TimeUnit.MILLISECONDS);
            
            logger.info("Market data generator started");
        } else {
            logger.warn("Market data generator is already running");
        }
    }
    
    /**
     * Logs a stock price update to the terminal.
     *
     * @param stockPrice the stock price to log
     */
    private void logStockPriceUpdate(StockPrice stockPrice) {
        String timestamp = TIME_FORMATTER.format(stockPrice.getTimestamp());
        String changeSymbol = stockPrice.getChange() >= 0 ? "+" : "";
        String changeColor = stockPrice.getChange() >= 0 ? "\u001B[32m" : "\u001B[31m"; // Green for positive, red for negative
        String resetColor = "\u001B[0m";
        
        System.out.printf("%s | %-5s | Price: $%.2f | %s%s%.2f (%.2f%%)%s | Volume: %d%n",
                timestamp,
                stockPrice.getSymbol(),
                stockPrice.getPrice(),
                changeColor,
                changeSymbol,
                stockPrice.getChange(),
                stockPrice.getPercentChange() * 100,
                resetColor,
                stockPrice.getVolume());
    }
    
    /**
     * Stops the market data generator.
     */
    public void stop() {
        if (running.compareAndSet(true, false)) {
            logger.info("Stopping market data generator");
            
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
            
            logger.info("Market data generator stopped");
        } else {
            logger.warn("Market data generator is not running");
        }
    }
    
    /**
     * Generates a random stock price for the given symbol.
     *
     * @param symbol the stock symbol
     * @return the generated stock price
     */
    private StockPrice generateStockPrice(String symbol) {
        double lastPrice = lastPrices.get(symbol);
        
        // Generate a random price change between -1% and +1%
        double changePercent = (random.nextDouble() * 2 - 1) * 0.01; // -1% to +1%
        double change = lastPrice * changePercent;
        double newPrice = lastPrice + change;
        
        // Ensure price doesn't go below 1.0
        newPrice = Math.max(newPrice, 1.0);
        
        // Round to 2 decimal places
        newPrice = Math.round(newPrice * 100.0) / 100.0;
        change = newPrice - lastPrice;
        changePercent = change / lastPrice;
        
        // Generate a random volume between 100 and 10000
        long volume = 100 + random.nextInt(9901);
        
        return new StockPrice(
                symbol,
                newPrice,
                change,
                changePercent,
                volume,
                Instant.now()
        );
    }
} 