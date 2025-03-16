package com.stockplus.marketdata.model;

import java.time.Instant;

/**
 * Model class representing stock price data.
 */
public class StockPrice {
    private String symbol;
    private double price;
    private double change;
    private double percentChange;
    private long volume;
    private Instant timestamp;

    public StockPrice() {
    }

    public StockPrice(String symbol, double price, double change, double percentChange, long volume, Instant timestamp) {
        this.symbol = symbol;
        this.price = price;
        this.change = change;
        this.percentChange = percentChange;
        this.volume = volume;
        this.timestamp = timestamp;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public double getChange() {
        return change;
    }

    public void setChange(double change) {
        this.change = change;
    }

    public double getPercentChange() {
        return percentChange;
    }

    public void setPercentChange(double percentChange) {
        this.percentChange = percentChange;
    }

    public long getVolume() {
        return volume;
    }

    public void setVolume(long volume) {
        this.volume = volume;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "StockPrice{" +
                "symbol='" + symbol + '\'' +
                ", price=" + price +
                ", change=" + change +
                ", percentChange=" + percentChange +
                ", volume=" + volume +
                ", timestamp=" + timestamp +
                '}';
    }
} 