package com.stockplus.marketdata;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.stockplus.marketdata.model.StockPrice;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;

/**
 * Service responsible for sending stock price data to Kafka.
 */
public class KafkaProducerService {
    private static final Logger logger = LoggerFactory.getLogger(KafkaProducerService.class);
    private static final String TOPIC_NAME = "stock-prices";
    private static final String BOOTSTRAP_SERVERS = "localhost:9092";
    
    private final KafkaProducer<String, String> producer;
    private final ObjectMapper objectMapper;
    
    public KafkaProducerService() {
        // Configure Kafka producer properties
        Properties properties = new Properties();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, BOOTSTRAP_SERVERS);
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        properties.put(ProducerConfig.ACKS_CONFIG, "1");
        
        // Add configurations to help with metadata fetch issues
        properties.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, "30000"); // 30 seconds
        properties.put(ProducerConfig.METADATA_MAX_AGE_CONFIG, "10000"); // 10 seconds
        properties.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, "500"); // 500ms
        properties.put(ProducerConfig.RETRIES_CONFIG, "3"); // 3 retries
        
        // Create Kafka producer
        this.producer = new KafkaProducer<>(properties);
        
        // Configure ObjectMapper for JSON serialization
        this.objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        logger.info("Kafka producer initialized with bootstrap servers: {}", BOOTSTRAP_SERVERS);
        logger.info("Publishing to topic: {}", TOPIC_NAME);
    }
    
    /**
     * Sends a stock price to Kafka.
     *
     * @param stockPrice the stock price to send
     */
    public void sendStockPrice(StockPrice stockPrice) {
        try {
            // Convert stock price to JSON
            String stockPriceJson = objectMapper.writeValueAsString(stockPrice);
            
            // Create a producer record with the stock symbol as the key
            ProducerRecord<String, String> record = new ProducerRecord<>(
                    TOPIC_NAME,
                    stockPrice.getSymbol(),
                    stockPriceJson
            );
            
            // Send the record to Kafka
            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    logger.error("Error sending stock price to Kafka: {}", exception.getMessage(), exception);
                } else {
                    logger.debug("Stock price sent to Kafka: topic={}, partition={}, offset={}",
                            metadata.topic(), metadata.partition(), metadata.offset());
                }
            });
            
        } catch (JsonProcessingException e) {
            logger.error("Error serializing stock price to JSON: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Closes the Kafka producer.
     */
    public void close() {
        if (producer != null) {
            producer.flush();
            producer.close();
            logger.info("Kafka producer closed");
        }
    }
} 