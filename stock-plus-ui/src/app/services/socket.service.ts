import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { map, timeout, catchError, filter } from 'rxjs/operators';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  volume: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private mockMode = true; // Set to true to use mock data for development
  private mockStockPrices: { [symbol: string]: StockPrice } = {};
  private stockPriceSubject = new Subject<StockPrice>();
  private defaultSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NFLX', 'NVDA', 'PYPL', 'INTC', 'AMD', 'CSCO', 'ADBE', 'ORCL', 'IBM', 'CRM'];
  private historicalDataCache: { [key: string]: StockPrice[] } = {};
  private updateInterval: any = null;
  private isConnected = false;

  constructor(private socket: Socket) {
    // Pre-generate mock data for all default symbols
    this.initializeMockData();
  }

  // Initialize mock data for all stocks
  private initializeMockData(): void {
    console.log('Socket service: Pre-generating mock data for all stocks');
    
    // Generate initial prices for all default symbols
    this.defaultSymbols.forEach(symbol => {
      this.mockStockPrices[symbol] = this.generateMockPrice(symbol);
    });
  }

  // Start sending mock updates
  private startMockUpdates(): void {
    console.log('Socket service: Starting mock updates');
    
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Emit initial values for all stocks
    this.defaultSymbols.forEach((symbol, index) => {
      // Stagger the initial updates to avoid overwhelming the UI
      setTimeout(() => {
        const price = this.mockStockPrices[symbol];
        console.log(`Socket service: Emitting initial price for ${symbol}: $${price.price.toFixed(2)}`);
        this.stockPriceSubject.next(price);
      }, index * 100); // Stagger by 100ms per stock
    });
    
    // Update random stocks every 1 second (faster updates)
    this.updateInterval = setInterval(() => {
      // Update 1-3 random stocks each interval
      const updateCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < updateCount; i++) {
        const randomSymbol = this.defaultSymbols[Math.floor(Math.random() * this.defaultSymbols.length)];
        const updatedPrice = this.generateMockPrice(randomSymbol);
        
        // Update the stored price
        this.mockStockPrices[randomSymbol] = updatedPrice;
        
        // Emit the updated price
        console.log(`Socket service: Emitting updated price for ${randomSymbol}: $${updatedPrice.price.toFixed(2)}`);
        this.stockPriceSubject.next(updatedPrice);
      }
    }, 1000); // Update every 1 second for more frequent updates
  }

  // Connect to the socket server
  connect(): void {
    if (this.isConnected) {
      console.log('Socket service: Already connected, skipping connect');
      return;
    }
    
    console.log('Socket service: Connecting to socket server');
    this.socket.connect();
    this.isConnected = true;
    
    // Set up socket event listeners for real-time updates
    this.setupSocketListeners();
    
    // Start mock updates if in mock mode
    if (this.mockMode) {
      this.startMockUpdates();
    }
  }
  
  // Set up socket event listeners
  private setupSocketListeners(): void {
    // Listen for stock price updates
    this.socket.on('stock-price', (data: any) => {
      console.log('Socket service: Received real-time stock price update:', data);
      const stockPrice = data as StockPrice;
      
      // Update our mock data with the real data
      if (stockPrice && stockPrice.symbol) {
        this.mockStockPrices[stockPrice.symbol] = stockPrice;
        
        // Forward the update to subscribers
        this.stockPriceSubject.next(stockPrice);
      }
    });
    
    // Listen for connection events
    this.socket.on('connect', () => {
      console.log('Socket service: Connected to server');
      
      // Request initial stock data
      this.socket.emit('get-all-stocks');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket service: Disconnected from server');
      
      // If we're in mock mode, restart mock updates
      if (this.mockMode && this.isConnected) {
        this.startMockUpdates();
      }
    });
    
    // Listen for all stocks data
    this.socket.on('all-stocks', (data: any) => {
      console.log('Socket service: Received all stocks data');
      
      if (Array.isArray(data)) {
        // Update our mock data with the real data
        data.forEach((stockPrice: StockPrice) => {
          if (stockPrice && stockPrice.symbol) {
            this.mockStockPrices[stockPrice.symbol] = stockPrice;
            
            // Forward the update to subscribers
            this.stockPriceSubject.next(stockPrice);
          }
        });
      }
    });
  }

  // Disconnect from the socket server
  disconnect(): void {
    console.log('Socket service: Disconnecting from socket server');
    
    // Clear the update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Remove all socket listeners
    this.socket.removeAllListeners();
    
    this.socket.disconnect();
    this.isConnected = false;
  }

  // Get all current stock prices immediately
  getAllStockPrices(): { [symbol: string]: StockPrice } {
    // Request all stocks from the server
    if (this.isConnected && !this.mockMode) {
      this.socket.emit('get-all-stocks');
    }
    
    // Return current data (will be updated when server responds)
    return { ...this.mockStockPrices };
  }

  // Get real-time stock price updates
  getStockPrices(): Observable<StockPrice> {
    console.log('Socket service: Subscribing to stock-price events');
    
    // Return our subject that emits stock price updates
    return this.stockPriceSubject.asObservable();
  }

  // Get historical stock prices for a specific symbol and interval
  getHistoricalPrices(symbol: string, interval: string = '1d'): Observable<StockPrice[]> {
    console.log('Socket service: Requesting historical data for', symbol, 'with interval', interval);
    
    // Check cache first
    const cacheKey = `${symbol}-${interval}`;
    if (this.historicalDataCache[cacheKey]) {
      console.log('Socket service: Returning cached historical data');
      return of(this.historicalDataCache[cacheKey]);
    }
    
    // If in mock mode or socket not connected, use mock data
    if (this.mockMode || !this.socket.connected) {
      console.log('Socket service: Using mock historical data');
      return new Observable<StockPrice[]>(observer => {
        const mockData = this.generateMockHistoricalData(symbol, interval);
        // Cache the data
        this.historicalDataCache[cacheKey] = mockData;
        console.log('Generated mock data:', mockData.length, 'items');
        setTimeout(() => {
          observer.next(mockData);
        }, 100); // Reduced timeout for faster loading
      });
    }
    
    // Try to get real data from socket with a timeout
    console.log('Socket service: Requesting historical data from server');
    this.socket.emit('get-historical', { symbol, interval });
    
    // Create an observable that listens for the historical-data event
    return new Observable<StockPrice[]>(observer => {
      // Set up a one-time listener for the historical-data event
      const listener = (data: any) => {
        console.log('Socket service: Received historical-data event');
        
        // Remove the listener to avoid memory leaks
        this.socket.off('historical-data', listener);
        
        // Process the data
        const stockData = data as StockPrice[];
        
        // If we received empty data, fall back to mock data
        if (!stockData || stockData.length === 0) {
          console.log('Socket service: Received empty data, falling back to mock data');
          const mockData = this.generateMockHistoricalData(symbol, interval);
          this.historicalDataCache[cacheKey] = mockData;
          observer.next(mockData);
        } else {
          // Cache the data
          this.historicalDataCache[cacheKey] = stockData;
          observer.next(stockData);
        }
        
        // Complete the observable
        observer.complete();
      };
      
      // Add the listener
      this.socket.on('historical-data', listener);
      
      // Set up a timeout
      const timeoutId = setTimeout(() => {
        // Remove the listener
        this.socket.off('historical-data', listener);
        
        console.log('Socket service: Timeout waiting for historical data, falling back to mock data');
        const mockData = this.generateMockHistoricalData(symbol, interval);
        this.historicalDataCache[cacheKey] = mockData;
        observer.next(mockData);
        observer.complete();
      }, 5000);
      
      // Clean up function
      return () => {
        clearTimeout(timeoutId);
        this.socket.off('historical-data', listener);
      };
    });
  }
  
  // Generate a mock price update for a symbol
  private generateMockPrice(symbol: string): StockPrice {
    // Get existing price if available to create realistic changes
    const existingPrice = this.mockStockPrices[symbol];
    let basePrice, price, change;
    
    if (existingPrice) {
      // Generate a small change from the existing price
      basePrice = existingPrice.price;
      change = (Math.random() - 0.5) * (basePrice * 0.02); // Max 2% change
      price = basePrice + change;
    } else {
      // Generate base price based on symbol for first time
      basePrice = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
      change = (Math.random() - 0.5) * 2;
      price = basePrice + change;
    }
    
    return {
      symbol,
      price,
      change,
      percentChange: change / price,
      volume: Math.floor(Math.random() * 10000) + 1000,
      timestamp: new Date().toISOString()
    };
  }
  
  // Generate mock historical data for development/testing
  private generateMockHistoricalData(symbol: string, interval: string): StockPrice[] {
    const now = new Date();
    const data: StockPrice[] = [];
    
    // Determine number of data points based on interval
    let points = 20;
    let timeStep = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    switch (interval) {
      case '1d':
        points = 24;
        timeStep = 60 * 60 * 1000; // 1 hour
        break;
      case '1w':
        points = 28;
        timeStep = 6 * 60 * 60 * 1000; // 6 hours
        break;
      case '1m':
        points = 30;
        timeStep = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '3m':
        points = 45;
        timeStep = 2 * 24 * 60 * 60 * 1000; // 2 days
        break;
      case '6m':
        points = 60;
        timeStep = 3 * 24 * 60 * 60 * 1000; // 3 days
        break;
      case '1y':
        points = 52;
        timeStep = 7 * 24 * 60 * 60 * 1000; // 1 week
        break;
      case '5y':
        points = 60;
        timeStep = 30 * 24 * 60 * 60 * 1000; // 1 month
        break;
    }
    
    // Generate base price based on symbol
    const basePrice = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
    let price = basePrice;
    
    // Generate data points
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * timeStep));
      
      // Add some randomness to the price
      const change = (Math.random() - 0.5) * 2;
      price += change;
      
      data.push({
        symbol,
        price,
        change,
        percentChange: change / price,
        volume: Math.floor(Math.random() * 10000) + 1000,
        timestamp: timestamp.toISOString()
      });
    }
    
    return data;
  }
} 