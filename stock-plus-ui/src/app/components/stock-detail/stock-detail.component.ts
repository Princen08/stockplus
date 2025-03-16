import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService, StockPrice } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import Chart, { ChartType } from 'chart.js/auto';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './stock-detail.component.html',
  styleUrl: './stock-detail.component.css'
})
export class StockDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('priceChart') priceChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  symbol: string = '';
  stockPrice: StockPrice | null = null;
  historicalPrices: StockPrice[] = [];
  priceChart: Chart | null = null;
  
  // Chart options
  chartTypes = ['Line', 'Candlestick', 'Bar', 'Area'];
  selectedChartType = 'Line';
  
  // Date interval options
  dateIntervals = [
    { label: '1 Day', value: '1d' },
    { label: '1 Week', value: '1w' },
    { label: '1 Month', value: '1m' },
    { label: '3 Months', value: '3m' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '1y' },
    { label: '5 Years', value: '5y' }
  ];
  selectedDateInterval = '1d';
  
  // Loading states
  isLoadingHistoricalData = false;
  loadingError: string | null = null;
  
  private stockSubscription: Subscription | null = null;
  private historicalSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private chartInitAttempted = false;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    console.log('StockDetailComponent initialized');
    // Connect to the socket server
    this.socketService.connect();
    
    // Get the stock symbol from the route parameters
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.symbol = params.get('symbol') || '';
      console.log('Route params - symbol:', this.symbol);
      
      if (this.symbol) {
        // Subscribe to real-time stock price updates for this symbol
        this.stockSubscription = this.socketService.getStockPrices().subscribe(
          (stockPrice: StockPrice) => {
            if (stockPrice.symbol === this.symbol) {
              this.stockPrice = stockPrice;
              console.log('Received real-time stock price update:', stockPrice);
              
              // Update the chart with the new price
              if (this.priceChart && this.historicalPrices.length > 0) {
                this.updateChart(stockPrice);
              }
            }
          },
          (error) => {
            console.error('Error receiving stock prices:', error);
          }
        );
        
        // Load historical data
        this.loadHistoricalData();
      }
    });
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit called, priceChartCanvas:', this.priceChartCanvas);
    // Initialize the chart if we already have historical data
    if (!this.chartInitAttempted && this.priceChartCanvas && this.historicalPrices.length > 0) {
      console.log('Initializing chart in ngAfterViewInit');
      this.initializeChart();
    } else {
      console.log('Cannot initialize chart yet. Canvas:', !!this.priceChartCanvas, 'Data length:', this.historicalPrices.length);
      
      // If we have the canvas but no data yet, we'll try again when data arrives
      if (this.priceChartCanvas && this.historicalPrices.length === 0 && !this.isLoadingHistoricalData) {
        console.log('Canvas is ready but no data yet, reloading historical data');
        this.loadHistoricalData();
      }
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    if (this.stockSubscription) {
      this.stockSubscription.unsubscribe();
    }
    
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
    }
    
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    // Destroy the chart
    if (this.priceChart) {
      this.priceChart.destroy();
    }
    
    // Disconnect from the socket server
    this.socketService.disconnect();
  }
  
  // Load historical data based on selected interval
  loadHistoricalData(): void {
    if (!this.symbol) return;
    
    this.isLoadingHistoricalData = true;
    this.loadingError = null;
    console.log('Loading historical data for symbol:', this.symbol, 'interval:', this.selectedDateInterval);
    
    // Unsubscribe from previous historical data subscription if exists
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
    }
    
    // Get historical prices for this symbol and interval
    this.historicalSubscription = this.socketService.getHistoricalPrices(this.symbol, this.selectedDateInterval).subscribe(
      (prices: StockPrice[]) => {
        this.isLoadingHistoricalData = false;
        this.historicalPrices = prices;
        console.log('Received historical prices:', prices.length, 'items');
        
        if (prices.length === 0) {
          this.loadingError = `No historical data available for ${this.symbol} with the selected time period.`;
          console.warn(this.loadingError);
          return;
        }
        
        // Initialize the chart with historical data
        if (this.priceChartCanvas) {
          console.log('Initializing chart after receiving historical data');
          setTimeout(() => this.initializeChart(), 0);
        } else {
          console.log('Cannot initialize chart yet. Canvas not available.');
          // We'll initialize the chart in ngAfterViewInit when the canvas is ready
        }
      },
      (error) => {
        this.isLoadingHistoricalData = false;
        this.loadingError = `Error loading historical data: ${error.message || 'Unknown error'}`;
        console.error('Error receiving historical prices:', error);
      }
    );
  }
  
  // Handle chart type change
  onChartTypeChange(): void {
    console.log('Chart type changed to:', this.selectedChartType);
    if (this.historicalPrices.length > 0) {
      this.initializeChart();
    }
  }
  
  // Handle date interval change
  onDateIntervalChange(): void {
    console.log('Date interval changed to:', this.selectedDateInterval);
    this.loadHistoricalData();
  }

  // Initialize the price chart with historical data
  private initializeChart(): void {
    console.log('initializeChart called');
    this.chartInitAttempted = true;
    
    if (!this.priceChartCanvas) {
      console.log('Cannot initialize chart. Canvas not available.');
      return;
    }
    
    if (this.historicalPrices.length === 0) {
      console.log('Cannot initialize chart. No historical data available.');
      return;
    }
    
    const ctx = this.priceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context from canvas');
      return;
    }
    
    // Destroy existing chart if it exists
    if (this.priceChart) {
      console.log('Destroying existing chart');
      this.priceChart.destroy();
    }
    
    // Extract data for the chart
    const labels = this.historicalPrices.map(price => {
      const date = new Date(price.timestamp);
      
      // Format the date based on the selected interval
      switch (this.selectedDateInterval) {
        case '1d':
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        case '1w':
          return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        case '1m':
        case '3m':
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        case '6m':
        case '1y':
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        case '5y':
          return date.toLocaleDateString([], { year: 'numeric', month: 'short' });
        default:
          return date.toLocaleTimeString();
      }
    });
    
    const prices = this.historicalPrices.map(price => price.price);
    console.log('Chart data prepared:', labels.length, 'labels,', prices.length, 'prices');
    
    // Determine chart type
    let chartType: ChartType = 'line';
    switch (this.selectedChartType) {
      case 'Line':
        chartType = 'line';
        break;
      case 'Bar':
        chartType = 'bar';
        break;
      case 'Area':
        chartType = 'line'; // Area is a line chart with fill
        break;
      case 'Candlestick':
        chartType = 'bar'; // We'll use bar as a fallback since Chart.js doesn't have candlestick by default
        break;
    }
    
    console.log('Creating chart with type:', chartType);
    // Create the chart
    try {
      this.priceChart = new Chart(ctx, {
        type: chartType,
        data: {
          labels: labels,
          datasets: [{
            label: `${this.symbol} Price`,
            data: prices,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: this.selectedChartType === 'Area' ? 'rgba(59, 130, 246, 0.1)' : 'rgb(59, 130, 246)',
            borderWidth: 2,
            tension: 0.1,
            fill: this.selectedChartType === 'Area'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: function(value) {
                  return '$' + (typeof value === 'number' ? value.toFixed(2) : value);
                }
              }
            },
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 0
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.parsed.y;
                  return '$' + (typeof value === 'number' ? value.toFixed(2) : value);
                }
              }
            }
          },
          animation: {
            duration: 500
          }
        }
      });
      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
      this.loadingError = `Error creating chart: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Update the chart with new price data
  private updateChart(newPrice: StockPrice): void {
    if (!this.priceChart) {
      console.log('Cannot update chart - chart not initialized');
      return;
    }
    
    // Add the new price to the chart
    this.priceChart.data.labels?.push(
      new Date(newPrice.timestamp).toLocaleTimeString()
    );
    
    this.priceChart.data.datasets[0].data.push(newPrice.price);
    console.log('Added new price to chart:', newPrice.price);
    
    // Remove the oldest price if we have more than 20 data points
    if ((this.priceChart.data.labels?.length || 0) > 20) {
      this.priceChart.data.labels?.shift();
      this.priceChart.data.datasets[0].data.shift();
      console.log('Removed oldest price point (keeping 20 points max)');
    }
    
    // Update the chart
    this.priceChart.update();
    console.log('Chart updated');
  }

  // Determine CSS class based on price change
  getPriceChangeClass(change: number): string {
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  }

  // Format price change with + or - sign
  formatPriceChange(change: number): string {
    return change >= 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
  }

  // Format percent change with + or - sign and % symbol
  formatPercentChange(percentChange: number): string {
    return percentChange >= 0 
      ? `+${(percentChange * 100).toFixed(2)}%` 
      : `${(percentChange * 100).toFixed(2)}%`;
  }
  
  // Get the display name for the current time period
  get currentTimeIntervalDisplay(): string {
    const interval = this.dateIntervals.find(i => i.value === this.selectedDateInterval);
    return interval ? interval.label : this.selectedDateInterval;
  }
}