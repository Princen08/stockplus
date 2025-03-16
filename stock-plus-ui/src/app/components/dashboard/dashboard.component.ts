import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService, StockPrice } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';
import 'chart.js/auto';  // Import this to register all controllers

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement> | null = null;
  @ViewChild('detailsSection') detailsSection: ElementRef | null = null;
  @ViewChild('searchContainer') searchContainer: ElementRef | null = null;
  private chart: Chart | null = null;
  
  stockPrices: { [symbol: string]: StockPrice } = {};
  latestUpdateTime: string | null = null;
  private stockSubscription: Subscription | null = null;
  
  // Dark mode state
  isDarkMode: boolean = false;
  
  // Search functionality
  searchTerm: string = '';
  showSearchResults: boolean = false;
  
  // View mode (grid or table)
  viewMode: 'grid' | 'table' = 'grid';
  
  // Sorting options
  sortOptions = [
    { value: 'symbol', label: 'Symbol (A-Z)' },
    { value: 'symbol-desc', label: 'Symbol (Z-A)' },
    { value: 'price', label: 'Price (Low-High)' },
    { value: 'price-desc', label: 'Price (High-Low)' },
    { value: 'change', label: 'Change (Low-High)' },
    { value: 'change-desc', label: 'Change (High-Low)' },
    { value: 'volume', label: 'Volume (Low-High)' },
    { value: 'volume-desc', label: 'Volume (High-Low)' }
  ];
  currentSort = 'symbol';
  
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
  
  // Selected stock for detailed view
  selectedStock: string | null = null;
  historicalData: StockPrice[] = [];
  private historicalSubscription: Subscription | null = null;

  // Pagination and loading state
  pageSize = 8;
  currentPage = 1;
  isLoading = true;
  
  // Debug info
  updateCount = 0;

  constructor(
    private socketService: SocketService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    // Check if dark mode was previously enabled
    this.loadDarkModePreference();
  }

  ngOnInit(): void {
    console.log('Dashboard component: Initializing');
    this.isLoading = true;
    
    // Connect to the socket server
    this.socketService.connect();
    
    // Load initial stock data immediately
    this.loadInitialStockData();
    
    // Apply dark mode if enabled
    this.applyDarkMode();
    
    // Subscribe to stock price updates
    this.stockSubscription = this.socketService.getStockPrices().subscribe(
      (stockPrice: StockPrice) => {
        this.ngZone.run(() => {
          if (stockPrice) {
            this.updateCount++;
            console.log(`Dashboard: Received update #${this.updateCount} for ${stockPrice.symbol}: $${stockPrice.price.toFixed(2)}`);
            
            // Update the stock price in our collection
            this.stockPrices[stockPrice.symbol] = stockPrice;
            
            // Update the latest timestamp whenever new data is received
            this.latestUpdateTime = stockPrice.timestamp;
            
            // Force change detection
            this.cdr.detectChanges();
          }
        });
      },
      (error) => {
        console.error('Error receiving stock prices:', error);
      }
    );
  }
  
  // Load initial stock data
  private loadInitialStockData(): void {
    console.log('Dashboard component: Loading initial stock data');
    // Get all current stock prices
    this.stockPrices = this.socketService.getAllStockPrices();
    
    if (Object.keys(this.stockPrices).length > 0) {
      // Set the latest update time to the current time
      this.latestUpdateTime = new Date().toISOString();
      console.log('Dashboard component: Loaded', Object.keys(this.stockPrices).length, 'stocks');
    }
    
    // Set loading to false even if we don't have data yet
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 500);
  }
  
  ngAfterViewInit(): void {
    // Initialize chart if we already have a selected stock
    if (this.selectedStock && this.historicalData.length > 0) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    console.log('Dashboard component: Destroying, received', this.updateCount, 'updates total');
    
    // Unsubscribe from stock price updates
    if (this.stockSubscription) {
      this.stockSubscription.unsubscribe();
    }
    
    // Unsubscribe from historical data if active
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
    }
    
    // Destroy chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Disconnect from the socket server
    this.socketService.disconnect();
  }

  // Get all stock prices as an array
  get stockPricesList(): StockPrice[] {
    const stocks = Object.values(this.stockPrices);
    return this.sortStocks(stocks);
  }
  
  // Sort stocks based on current sort option
  private sortStocks(stocks: StockPrice[]): StockPrice[] {
    const sortField = this.currentSort.includes('-desc') 
      ? this.currentSort.replace('-desc', '') 
      : this.currentSort;
    
    const isDescending = this.currentSort.includes('-desc');
    
    return [...stocks].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change':
          comparison = a.change - b.change;
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
        default:
          comparison = a.symbol.localeCompare(b.symbol);
      }
      
      return isDescending ? -comparison : comparison;
    });
  }
  
  // Change the current sort option
  changeSortOrder(sortOption: string): void {
    this.currentSort = sortOption;
    // Reset to first page when changing sort order
    this.currentPage = 1;
  }
  
  // Get filtered stock prices based on search term (for dropdown only)
  get searchResults(): StockPrice[] {
    if (!this.searchTerm.trim()) {
      return [];
    }
    
    const searchTermLower = this.searchTerm.toLowerCase();
    return this.stockPricesList.filter(stock => 
      stock.symbol.toLowerCase().includes(searchTermLower)
    ).slice(0, 5); // Limit to 5 results for dropdown
  }
  
  // Get paginated stock prices (using all stocks, not filtered)
  get paginatedStockPrices(): StockPrice[] {
    const allStocks = this.stockPricesList;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return allStocks.slice(startIndex, startIndex + this.pageSize);
  }
  
  // Get total number of pages (based on all stocks)
  get totalPages(): number {
    return Math.ceil(this.stockPricesList.length / this.pageSize);
  }
  
  // Calculate the end index for pagination display
  get paginationEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.stockPricesList.length);
  }
  
  // Go to next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  // Go to previous page
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
  
  // Go to a specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
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
  
  // Navigate to stock detail page
  navigateToStockDetail(symbol: string): void {
    this.router.navigate(['/stock', symbol]);
  }
  
  // Load historical data for a stock (for inline details - no longer used)
  loadStockDetails(symbol: string): void {
    // Now we just navigate to the stock detail page
    this.navigateToStockDetail(symbol);
  }
  
  // Scroll to the details section
  private scrollToDetails(): void {
    if (this.detailsSection) {
      this.detailsSection.nativeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
  
  // Update chart when date interval changes
  onDateIntervalChange(): void {
    if (this.selectedStock) {
      this.loadStockDetails(this.selectedStock);
    }
  }
  
  // Update chart when chart type changes
  onChartTypeChange(): void {
    if (this.historicalData.length > 0) {
      this.renderChart();
    }
  }
  
  // Close the detailed view
  closeDetails(): void {
    this.selectedStock = null;
    this.historicalData = [];
    
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
      this.historicalSubscription = null;
    }
    
    // Destroy chart if it exists
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
  
  // Render the chart based on selected type and data
  private renderChart(): void {
    if (!this.chartCanvas || !this.selectedStock || this.historicalData.length === 0) {
      return;
    }
    
    // Destroy previous chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Prepare data for the chart
    const labels = this.historicalData.map(item => {
      const date = new Date(item.timestamp);
      return date.toLocaleTimeString();
    });
    
    const prices = this.historicalData.map(item => item.price);
    
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
    
    // Configure chart
    const config: ChartConfiguration = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: `${this.selectedStock} Price`,
          data: prices,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: this.selectedChartType === 'Area' ? 'rgba(75, 192, 192, 0.2)' : 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: this.selectedChartType === 'Area'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    };
    
    // Create the chart
    this.chart = new Chart(ctx, config);
  }
  
  // Toggle between grid and table view
  toggleViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    // Reset to first page when changing view mode
    this.currentPage = 1;
  }
  
  // Force refresh the stock data
  refreshStockData(): void {
    console.log('Dashboard: Manually refreshing stock data');
    this.isLoading = true;
    
    // Reconnect to the socket server
    this.socketService.disconnect();
    setTimeout(() => {
      this.socketService.connect();
      this.loadInitialStockData();
    }, 500);
  }
  
  // Search for a stock and navigate to its details
  searchStock(): void {
    if (!this.searchTerm.trim()) return;
    
    const searchTermUpper = this.searchTerm.toUpperCase();
    const matchingStock = Object.values(this.stockPrices).find(
      stock => stock.symbol.toUpperCase() === searchTermUpper
    );
    
    if (matchingStock) {
      this.navigateToStockDetail(matchingStock.symbol);
    }
  }
  
  // Handle search input changes
  onSearchInput(): void {
    this.showSearchResults = this.searchTerm.trim().length > 0;
    this.cdr.detectChanges();
  }
  
  // Close search results
  closeSearchResults(): void {
    this.showSearchResults = false;
  }

  // Close search results when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if searchContainer exists and if the click was outside of it
    if (this.searchContainer && this.showSearchResults) {
      const clickedInside = this.searchContainer.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.closeSearchResults();
      }
    }
  }

  // Toggle dark mode
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyDarkMode();
    this.saveDarkModePreference();
  }
  
  // Apply dark mode to the document
  private applyDarkMode(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }
  
  // Save dark mode preference to localStorage
  private saveDarkModePreference(): void {
    localStorage.setItem('darkMode', this.isDarkMode ? 'true' : 'false');
  }
  
  // Load dark mode preference from localStorage
  private loadDarkModePreference(): void {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference) {
      this.isDarkMode = savedPreference === 'true';
    } else {
      // Check if user prefers dark mode at OS level
      this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }
} 