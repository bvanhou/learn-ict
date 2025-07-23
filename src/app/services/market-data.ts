import { Time } from "lightweight-charts";

// Market data service for fetching real financial data
export interface MarketDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  data: MarketDataPoint[];
  symbol: string;
  interval: string;
  error?: string;
}

// Yahoo Finance API endpoints
const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

export class MarketDataService {
  private static async fetchFromYahoo(
    symbol: string,
    interval: string,
    range: string
  ): Promise<MarketDataResponse> {
    try {
      // Use our Next.js API route to avoid CORS issues
      const url = `/api/market-data?symbol=${encodeURIComponent(
        symbol
      )}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(
        range
      )}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }

      return {
        data: data.data,
        symbol: data.symbol,
        interval: data.interval,
      };
    } catch (error) {
      console.error("Error fetching market data:", error);
      return {
        data: [],
        symbol,
        interval,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get NQ futures data
  static async getNQData(
    interval: string = "1h",
    range: string = "1d"
  ): Promise<MarketDataResponse> {
    return this.fetchFromYahoo("NQZ25.CME", interval, range);
  }

  // Get NQ data with different timeframes
  static async getNQDataByTimeframe(
    timeframe: string
  ): Promise<MarketDataResponse> {
    // Handle combined timeframe format (header-footer)
    if (timeframe.includes("-")) {
      const [headerTimeframe, footerTimeframe] = timeframe.split("-");
      return this.getNQDataByCombinedTimeframe(
        headerTimeframe,
        footerTimeframe
      );
    }

    const timeframeMap: Record<string, { interval: string; range: string }> = {
      // Header timeframes (intraday)
      "30s": { interval: "1m", range: "1d" },
      "1m": { interval: "1m", range: "1d" },
      "5m": { interval: "5m", range: "5d" },
      "15m": { interval: "15m", range: "5d" },
      "1h": { interval: "1h", range: "1mo" },
      "4h": { interval: "1h", range: "3mo" },
      "1d": { interval: "1d", range: "1y" },
      "1w": { interval: "1wk", range: "5y" },

      // Footer timeframes (date ranges)
      "1D": { interval: "1m", range: "1d" },
      "5D": { interval: "5m", range: "5d" },
      "1M": { interval: "1h", range: "1mo" },
      "3M": { interval: "1d", range: "3mo" },
      "6M": { interval: "1d", range: "6mo" },
      YTD: { interval: "1d", range: "ytd" },
      "1Y": { interval: "1d", range: "1y" },
      "5Y": { interval: "1wk", range: "5y" },
      ALL: { interval: "1mo", range: "max" },
    };

    const config = timeframeMap[timeframe] || { interval: "1h", range: "1d" };
    return this.fetchFromYahoo("NQZ25.CME", config.interval, config.range);
  }

  // Get NQ data with combined header and footer timeframes
  static async getNQDataByCombinedTimeframe(
    headerTimeframe: string,
    footerTimeframe: string
  ): Promise<MarketDataResponse> {
    // Map header timeframes to intervals
    const headerMap: Record<string, string> = {
      "30s": "1m",
      "1m": "1m",
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "4h": "1h",
      "1d": "1d",
      "1w": "1wk",
    };

    // Map footer timeframes to ranges
    const footerMap: Record<string, string> = {
      "1D": "1d",
      "5D": "5d",
      "1M": "1mo",
      "3M": "3mo",
      "6M": "6mo",
      YTD: "ytd",
      "1Y": "1y",
      "5Y": "5y",
      ALL: "max",
    };

    const interval = headerMap[headerTimeframe] || "1h";
    const range = footerMap[footerTimeframe] || "1d";

    return this.fetchFromYahoo("NQZ25.CME", interval, range);
  }

  // Get data for different symbols
  static async getData(
    symbol: string,
    interval: string = "1h",
    range: string = "1d"
  ): Promise<MarketDataResponse> {
    return this.fetchFromYahoo(symbol, interval, range);
  }
}

// Alternative data sources
export class AlternativeDataService {
  // Alpha Vantage API (requires API key)
  static async getAlphaVantageData(
    symbol: string,
    apikey: string
  ): Promise<MarketDataResponse> {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${apikey}`;

      const response = await fetch(url);
      const data = await response.json();

      // Parse Alpha Vantage response format
      const timeSeriesData = data["Time Series (1min)"];
      const marketData: MarketDataPoint[] = [];

      for (const [timestamp, values] of Object.entries(timeSeriesData)) {
        const time = new Date(timestamp).getTime();
        const valueObj = values as Record<string, string>;
        marketData.push({
          time,
          open: parseFloat(valueObj["1. open"]),
          high: parseFloat(valueObj["2. high"]),
          low: parseFloat(valueObj["3. low"]),
          close: parseFloat(valueObj["4. close"]),
          volume: parseInt(valueObj["5. volume"]),
        });
      }

      return {
        data: marketData.sort((a, b) => a.time - b.time),
        symbol,
        interval: "1min",
      };
    } catch (error) {
      console.error("Error fetching Alpha Vantage data:", error);
      return {
        data: [],
        symbol,
        interval: "1min",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Utility functions for data processing
export const MarketDataUtils = {
  // Convert data to lightweight-charts format
  toLightweightChartsFormat(data: MarketDataPoint[]) {
    return data.map((point) => ({
      time: point.time as Time, // Already in seconds, lightweight-charts expects seconds
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
    }));
  },

  // Filter data by date range
  filterByDateRange(data: MarketDataPoint[], startDate: Date, endDate: Date) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return data.filter(
      (point) => point.time >= startTime && point.time <= endTime
    );
  },

  // Calculate basic statistics
  calculateStats(data: MarketDataPoint[]) {
    if (data.length === 0) return null;

    const prices = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);

    return {
      currentPrice: prices[prices.length - 1],
      change: prices[prices.length - 1] - prices[0],
      changePercent:
        ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
      high: Math.max(...prices),
      low: Math.min(...prices),
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
    };
  },
};
